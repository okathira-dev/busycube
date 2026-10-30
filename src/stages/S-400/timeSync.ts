type ProviderId = "utctime" | "timeapi";
export interface TimeReference {
  utcMs: number;
  receivedPerf: number;
}
export const timeProviders = [
  { id: "utctime", url: "https://utctime.app/api/now" },
  {
    id: "timeapi",
    url: "https://timeapi.io/api/Time/current/zone?timeZone=Etc%2FUTC",
  },
] as const;
type Provider = (typeof timeProviders)[number];

export function parseUtc(id: ProviderId, body: unknown): number {
  if (typeof body !== "object" || body === null)
    throw new Error("Invalid time response");
  const value = body as Record<string, unknown>;
  let utc: number;
  if (id === "utctime") {
    if (typeof value.unix_ms !== "number")
      throw new Error("Invalid UTC milliseconds");
    utc = value.unix_ms;
  } else {
    if (
      value.timeZone !== "Etc/UTC" ||
      typeof value.dateTime !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value.dateTime)
    )
      throw new Error("Invalid UTC datetime");
    utc = Date.parse(`${value.dateTime}Z`);
  }
  if (!Number.isFinite(utc) || utc < 1577836800000 || utc > 4102444800000)
    throw new Error("UTC outside supported range");
  return utc;
}

export function estimateUtc(
  reference: TimeReference | null,
  now: number,
): number | null {
  if (!reference) return null;
  const age = now - reference.receivedPerf;
  return age >= 0 && age <= 45000 ? reference.utcMs + age : null;
}

export class ExternalTimeSync {
  private order: Provider[];
  private cooldowns = new Map<ProviderId, number>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | null = null;
  private running = false;
  private enabled = false;
  private disposed = false;
  private version = 0;
  private nextAttempt = 0;
  private failures = 0;
  reference: TimeReference | null = null;

  constructor(
    private readonly changed: (reference: TimeReference | null) => void,
    private readonly request: typeof fetch = fetch,
    private readonly now: () => number = () => performance.now(),
    reverse = Math.random() < 0.5,
  ) {
    this.order = reverse ? [...timeProviders].reverse() : [...timeProviders];
  }

  start() {
    if (this.disposed) return;
    this.enabled = true;
    this.schedule();
  }
  suspend() {
    this.enabled = false;
    this.version += 1;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.reference = null;
    this.changed(null);
  }
  invalidate() {
    this.reference = null;
    this.changed(null);
    this.nextAttempt = 0;
    this.schedule();
  }
  dispose() {
    this.suspend();
    this.disposed = true;
  }

  private schedule() {
    clearTimeout(this.timer);
    if (!this.enabled || this.disposed || this.running) return;
    const readyAt = Math.min(
      ...this.order.map((provider) => this.cooldowns.get(provider.id) ?? 0),
    );
    if (!Number.isFinite(readyAt)) return;
    this.timer = setTimeout(
      () => void this.sync(),
      Math.max(0, this.nextAttempt - this.now(), readyAt - this.now()),
    );
  }

  private async sync() {
    if (!this.enabled || this.disposed || this.running) return;
    this.running = true;
    const version = this.version;
    let success = false;
    this.reference = null;
    this.changed(null);
    try {
      for (const provider of this.order) {
        if (!this.enabled || version !== this.version) return;
        const began = this.now();
        if (began < (this.cooldowns.get(provider.id) ?? 0)) continue;
        this.cooldowns.set(provider.id, began + 30000);
        const controller = new AbortController();
        this.controller = controller;
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await this.request(provider.url, {
            signal: controller.signal,
            cache: "no-store",
            credentials: "omit",
            referrerPolicy: "no-referrer",
          });
          if (response.status === 429) {
            const retry = response.headers.get("Retry-After");
            // A wall-clock date cannot be trusted while the player changes that clock.
            this.cooldowns.set(
              provider.id,
              retry && /^\d+$/.test(retry)
                ? this.now() + Math.max(30000, Number(retry) * 1000)
                : Infinity,
            );
          }
          if (!response.ok) throw new Error("Time request failed");
          const age = response.headers.get("Age");
          if (
            age !== null &&
            (!Number.isFinite(Number(age)) ||
              Number(age) < 0 ||
              Number(age) > 2)
          )
            throw new Error("Stale time response");
          const utc = parseUtc(provider.id, await response.json());
          const finished = this.now();
          if (finished - began > 8000)
            throw new Error("Time response arrived too late");
          if (
            !this.enabled ||
            version !== this.version ||
            controller.signal.aborted
          )
            return;
          this.reference = {
            utcMs: utc + (finished - began) / 2,
            receivedPerf: finished,
          };
          this.changed(this.reference);
          this.order = [
            provider,
            ...this.order.filter((candidate) => candidate !== provider),
          ];
          success = true;
          break;
        } catch {
          // Try each provider at most once in this cycle, with its own cooldown.
        } finally {
          clearTimeout(timeout);
          if (this.controller === controller) this.controller = null;
        }
      }
      if (this.enabled && version === this.version) {
        this.failures = success ? 0 : Math.min(3, this.failures + 1);
        this.nextAttempt =
          this.now() +
          (success ? 30000 : Math.min(240000, 30000 * 2 ** this.failures));
      }
    } finally {
      this.running = false;
      this.schedule();
    }
  }
}
