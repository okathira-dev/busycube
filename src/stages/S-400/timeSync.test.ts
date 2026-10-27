import { ExternalTimeSync, estimateUtc, parseUtc } from "./timeSync";

const utc = Date.UTC(2026, 9, 26, 3);
beforeEach(() =>
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "Date", "performance"],
  }),
);
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("parses timezone-free provider responses strictly as UTC and rejects invalid values", () => {
  expect(parseUtc("utctime", { unix_ms: utc })).toBe(utc);
  expect(
    parseUtc("timeapi", {
      timeZone: "Etc/UTC",
      dateTime: "2026-10-26T03:00:00",
    }),
  ).toBe(utc);
  expect(() =>
    parseUtc("timeapi", {
      timeZone: "Asia/Tokyo",
      dateTime: "2026-10-26T03:00:00",
    }),
  ).toThrow();
  expect(() => parseUtc("utctime", { unix_ms: Number.NaN })).toThrow();
  expect(estimateUtc({ utcMs: utc, receivedPerf: 0 }, 1000)).toBe(utc + 1000);
  expect(estimateUtc({ utcMs: utc, receivedPerf: 0 }, 45001)).toBeNull();
});

it("resynchronizes every thirty seconds and stops on suspension or disposal", async () => {
  const request = vi.fn(async () => Response.json({ unix_ms: utc }));
  const sync = new ExternalTimeSync(
    vi.fn(),
    request,
    () => performance.now(),
    false,
  );
  sync.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(sync.reference?.utcMs).toBe(utc);
  await vi.advanceTimersByTimeAsync(29999);
  expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledTimes(2);
  sync.suspend();
  await vi.advanceTimersByTimeAsync(60000);
  expect(request).toHaveBeenCalledTimes(2);
  expect(sync.reference).toBeNull();
  sync.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledTimes(3);
  sync.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

it("falls back sequentially and honors the limited provider's Retry-After", async () => {
  const request = vi.fn(async (url: RequestInfo | URL) =>
    String(url).includes("utctime")
      ? new Response(null, { status: 429, headers: { "Retry-After": "120" } })
      : Response.json({ timeZone: "Etc/UTC", dateTime: "2026-10-26T03:00:00" }),
  );
  const sync = new ExternalTimeSync(
    vi.fn(),
    request,
    () => performance.now(),
    false,
  );
  sync.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledTimes(2);
  expect(sync.reference?.utcMs).toBe(utc);
  await vi.advanceTimersByTimeAsync(30000);
  expect(request).toHaveBeenCalledTimes(3);
  expect(String(request.mock.calls[2]?.[0])).toContain("timeapi.io");
  sync.dispose();
});

it("rejects old cache responses and backs off after all providers fail", async () => {
  const request = vi.fn(async () =>
    Response.json({ unix_ms: utc }, { headers: { Age: "30" } }),
  );
  const sync = new ExternalTimeSync(
    vi.fn(),
    request,
    () => performance.now(),
    false,
  );
  sync.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledTimes(2);
  expect(sync.reference).toBeNull();
  await vi.advanceTimersByTimeAsync(59999);
  expect(request).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledTimes(4);
  sync.dispose();
});

it("aborts an in-flight request and never accepts a response delivered after disposal", async () => {
  const completions: Array<(response: Response) => void> = [];
  const request = vi.fn(
    (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        completions.push(resolve);
      }),
  );
  const sync = new ExternalTimeSync(
    vi.fn(),
    request,
    () => performance.now(),
    false,
  );
  sync.start();
  await vi.advanceTimersByTimeAsync(0);
  const signal = request.mock.calls[0]?.[1]?.signal;
  sync.dispose();
  expect(signal?.aborted).toBe(true);
  completions[0]?.(Response.json({ unix_ms: utc }));
  await vi.advanceTimersByTimeAsync(0);
  expect(sync.reference).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
