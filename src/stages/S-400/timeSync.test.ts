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
  vi.unstubAllGlobals();
});

it("calls the browser fetch without binding it to the synchronizer", async () => {
  const request = vi.fn(function (this: unknown) {
    if (this !== undefined && this !== globalThis)
      throw new TypeError("Illegal invocation");
    return Promise.resolve(
      Response.json({
        unix_ms: utc,
        timeZone: "Etc/UTC",
        dateTime: "2026-10-26T03:00:00",
      }),
    );
  });
  vi.stubGlobal("fetch", request);
  const sync = new ExternalTimeSync(vi.fn());
  sync.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledOnce();
  expect(sync.reference?.utcMs).toBe(utc);
  sync.dispose();
});

it("parses timezone-free provider responses strictly as UTC and rejects invalid values", () => {
  expect(parseUtc("server", { unix_ms: utc })).toBe(utc);
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

it.each([false, true])(
  "uses external time without contacting the server and stops on disposal (reverse=%s)",
  async (reverse) => {
    const request = vi.fn(async () =>
      Response.json({
        unix_ms: utc,
        timeZone: "Etc/UTC",
        dateTime: "2026-10-26T03:00:00",
      }),
    );
    const sync = new ExternalTimeSync(
      vi.fn(),
      request,
      () => performance.now(),
      reverse,
    );
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.reference?.utcMs).toBe(utc);
    expect(request).toHaveBeenCalledWith(
      reverse
        ? expect.stringContaining("timeapi.io")
        : expect.stringContaining("utctime.app"),
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      }),
    );
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
    expect(request.mock.calls).not.toContainEqual([
      "/api/time",
      expect.anything(),
    ]);
    sync.dispose();
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("falls back sequentially and honors the limited provider's Retry-After", async () => {
  const request = vi.fn(async (url: RequestInfo | URL) =>
    String(url) === "/api/time"
      ? new Response(null, { status: 503 })
      : String(url).includes("utctime")
        ? new Response(null, { status: 429, headers: { "Retry-After": "120" } })
        : Response.json({
            timeZone: "Etc/UTC",
            dateTime: "2026-10-26T03:00:00",
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
  expect(request).toHaveBeenCalledTimes(2);
  expect(sync.reference?.utcMs).toBe(utc);
  await vi.advanceTimersByTimeAsync(30000);
  expect(request).toHaveBeenCalledTimes(3);
  expect(String(request.mock.calls[2]?.[0])).toContain("timeapi.io");
  sync.dispose();
});

it.each([false, true])(
  "keeps the server last after fallback and returns to external time (reverse=%s)",
  async (reverse) => {
    let externalAvailable = false;
    const request = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) !== "/api/time" && !externalAvailable)
        return new Response(null, { status: 503 });
      return Response.json({
        unix_ms: utc,
        timeZone: "Etc/UTC",
        dateTime: "2026-10-26T03:00:00",
      });
    });
    const sync = new ExternalTimeSync(
      vi.fn(),
      request,
      () => performance.now(),
      reverse,
    );
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.reference?.utcMs).toBe(utc);
    const order = request.mock.calls.map(([url]) => String(url));
    expect(order).toEqual([
      reverse
        ? expect.stringContaining("timeapi.io")
        : expect.stringContaining("utctime.app"),
      reverse
        ? expect.stringContaining("utctime.app")
        : expect.stringContaining("timeapi.io"),
      "/api/time",
    ]);
    await vi.advanceTimersByTimeAsync(30000);
    expect(request.mock.calls.slice(3).map(([url]) => String(url))).toEqual(
      order,
    );
    externalAvailable = true;
    await vi.advanceTimersByTimeAsync(30000);
    expect(request).toHaveBeenCalledTimes(7);
    expect(String(request.mock.calls[6]?.[0])).toBe(order[0]);
    sync.dispose();
  },
);

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
  expect(request).toHaveBeenCalledTimes(3);
  expect(sync.reference).toBeNull();
  await vi.advanceTimersByTimeAsync(59999);
  expect(request).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledTimes(6);
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
