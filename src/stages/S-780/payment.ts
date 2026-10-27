export type BoxId = "B01" | "B02" | "B03" | "B04";
export interface PaymentReply {
  requestId: string;
  methodName: string;
  details: unknown;
  complete(result?: string): Promise<void>;
  retry?(errors?: unknown): Promise<void>;
}
export interface PaymentRequestLike {
  show(): Promise<PaymentReply>;
  abort(): Promise<void>;
}
type PaymentConstructor = new (
  methods: unknown[],
  details: unknown,
) => PaymentRequestLike;
export const wallets = [
  { id: "circle", path: "/payment/wallet-circle/", name: "Pocket Wallet" },
  { id: "diamond", path: "/payment/wallet-diamond/", name: "Busycube Wallet" },
] as const;
type WalletId = (typeof wallets)[number]["id"];
const detail = (value: unknown) =>
  value && typeof value === "object"
    ? (value as { outcome?: unknown; accepted?: unknown; wallet?: unknown })
    : {};
const walletId = (value: unknown): WalletId | null =>
  value === "circle" || value === "diamond" ? value : null;
function activated(
  registration: ServiceWorkerRegistration,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker =
      registration.installing ?? registration.waiting ?? registration.active;
    const cleanup = () => {
      clearTimeout(timer);
      worker?.removeEventListener("statechange", inspect);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const inspect = () => {
      if (signal.aborted) {
        abort();
        return;
      }
      if (worker?.state === "activated") {
        cleanup();
        resolve();
      } else if (!worker || worker.state === "redundant") {
        cleanup();
        reject(new Error("Wallet unavailable"));
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Wallet timed out"));
    }, 10_000);
    worker?.addEventListener("statechange", inspect);
    signal.addEventListener("abort", abort, { once: true });
    inspect();
  });
}
interface Attempt {
  id: string;
  active: boolean;
  stopped: boolean;
  controller: AbortController;
  request: PaymentRequestLike | null;
  response: PaymentReply | null;
  completing: boolean;
  completed: boolean;
  workers: ServiceWorker[];
  events: Set<string>;
  retryIssued: boolean;
  retryWallet: WalletId | null;
}
export function paymentSession(
  signal: AbortSignal,
  locale: string,
  change: (status: string, running: boolean) => void,
  solve: (id: BoxId) => void,
) {
  const container = navigator.serviceWorker;
  const method = new URL("/payment/method", location.origin).href;
  let alive = true;
  let current: Attempt | null = null;
  const solved = new Set<BoxId>();
  const valid = (a: Attempt) =>
    alive &&
    !signal.aborted &&
    a.active &&
    current === a &&
    !a.controller.signal.aborted;
  const award = (a: Attempt, id: BoxId) => {
    if (valid(a) && !solved.has(id)) {
      solved.add(id);
      solve(id);
    }
  };
  const finish = (a: Attempt, abort: boolean) => {
    a.active = false;
    a.controller.abort();
    if (current === a) current = null;
    if (!a.stopped) {
      a.stopped = true;
      for (const worker of a.workers) {
        try {
          worker.postMessage({
            channel: "busycube-payment",
            type: "merchant-stop",
            requestId: a.id,
          });
        } catch {}
      }
      if (abort) {
        try {
          void a.request?.abort().catch(() => {});
        } catch {}
      }
    }
    if (abort) {
      if (a.response && !a.retryIssued && !a.completed && !a.completing) {
        a.completing = true;
        try {
          void a.response.complete("unknown").catch(() => {});
        } catch {}
      }
    }
  };
  const onMessage = (event: MessageEvent<unknown>) => {
    const a = current;
    if (
      !a ||
      !valid(a) ||
      !event.isTrusted ||
      event.origin !== location.origin ||
      !event.data ||
      typeof event.data !== "object"
    )
      return;
    const data = event.data as {
      channel?: unknown;
      type?: unknown;
      requestId?: unknown;
      eventId?: unknown;
      methodName?: unknown;
      trusted?: unknown;
      wallet?: unknown;
    };
    if (
      data.channel !== "busycube-payment" ||
      data.type !== "handler-event" ||
      data.requestId !== a.id ||
      data.methodName !== method ||
      data.trusted !== true ||
      typeof data.eventId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(data.eventId)
    )
      return;
    const wallet = wallets.find((candidate) => candidate.id === data.wallet);
    const source = event.source;
    if (
      !wallet ||
      !source ||
      !("scriptURL" in source) ||
      source.scriptURL !==
        new URL("payment-handler-sw.js", new URL(wallet.path, location.origin))
          .href ||
      a.events.has(data.eventId)
    )
      return;
    const hadPreviousEvent = a.events.size > 0;
    a.events.add(data.eventId);
    if (wallet.id === "diamond") award(a, "B04");
    // A second genuine PaymentRequestEvent in the same retry session is positive
    // evidence before the handler supplies another approval. Event IDs survive
    // worker restarts without assuming its in-memory attempt counter survived.
    if (a.retryIssued && hadPreviousEvent && a.retryWallet === wallet.id)
      award(a, "B03");
  };
  container?.addEventListener("message", onMessage);
  const begin = async () => {
    if (!alive || signal.aborted || current) return;
    const Constructor = (
      window as unknown as { PaymentRequest?: PaymentConstructor }
    ).PaymentRequest;
    if (!Constructor || !container) {
      change("unavailable", false);
      return;
    }
    const a: Attempt = {
      id: `busycube-${crypto.randomUUID()}`,
      active: true,
      stopped: false,
      controller: new AbortController(),
      request: null,
      response: null,
      completing: false,
      completed: false,
      workers: [],
      events: new Set(),
      retryIssued: false,
      retryWallet: null,
    };
    current = a;
    change("waiting", true);
    let status = "idle";
    try {
      for (const wallet of wallets) {
        const registration = await container.register(
          new URL(
            "payment-handler-sw.js",
            new URL(wallet.path, location.origin),
          ),
          { scope: wallet.path, updateViaCache: "none" },
        );
        if (!valid(a)) return;
        await activated(registration, a.controller.signal);
        if (!valid(a)) return;
        const manager = (
          registration as ServiceWorkerRegistration & {
            paymentManager?: { userHint: string };
          }
        ).paymentManager;
        if (!manager || !registration.active)
          throw new Error("Payment Handler unavailable");
        manager.userHint = wallet.name;
        a.workers.push(registration.active);
      }
      if (!valid(a)) return;
      a.request = new Constructor(
        [{ supportedMethods: method, data: { busycube: true, locale } }],
        {
          id: a.id,
          total: { label: "BCU", amount: { currency: "BCU", value: "1.00" } },
        },
      );
      const response = await a.request.show();
      a.response = response;
      if (!valid(a)) {
        finish(a, true);
        return;
      }
      const complete = async (result: string) => {
        a.completing = true;
        await response.complete(result);
        a.completed = true;
      };
      if (response.requestId !== a.id || response.methodName !== method) {
        await complete("unknown");
        status = "invalid";
        return;
      }
      const first = detail(response.details);
      if (first.outcome === "approved" && first.accepted === true) {
        await complete("success");
        award(a, "B01");
        status = "success";
        return;
      }
      if (first.outcome === "declined" && first.accepted === false) {
        await complete("fail");
        award(a, "B02");
        status = "success";
        return;
      }
      if (
        first.outcome !== "needs-retry" ||
        first.accepted !== false ||
        typeof response.retry !== "function"
      ) {
        await complete("fail");
        status = "unavailable";
        return;
      }
      a.retryWallet = walletId(first.wallet);
      const retry = response.retry({ error: "BCU" });
      a.retryIssued = true;
      if (valid(a)) change("pending", true);
      await retry;
      if (!valid(a)) {
        finish(a, true);
        return;
      }
      a.retryIssued = false;
      const next = detail(response.details);
      await complete(
        next.outcome === "approved" && next.accepted === true
          ? "success"
          : "fail",
      );
      // No award here: retry promise settlement is the end of payment UI, not
      // the early retry-entry observation that opens B03.
    } catch (error) {
      status =
        error instanceof DOMException && error.name === "AbortError"
          ? "cancelled"
          : "unavailable";
    } finally {
      const visible = valid(a);
      finish(a, !a.completed);
      if (visible) change(status, false);
    }
  };
  const cancel = () => {
    if (!alive) return;
    if (current) finish(current, true);
    change("cancelled", false);
  };
  const dispose = () => {
    if (!alive) return;
    if (current) finish(current, true);
    alive = false;
    container?.removeEventListener("message", onMessage);
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) dispose();
  return { begin, cancel, dispose };
}
