import { splice } from "./splice";

class BufferFixture extends EventTarget {
  mode = "";
  timestampOffset = 0;
  updating = false;
  offsets: number[] = [];
  failure: "throw" | "error" | null = null;
  appendBuffer() {
    if (this.failure === "throw") throw new Error("Decode failure");
    this.offsets.push(this.timestampOffset);
    this.updating = true;
    queueMicrotask(() => {
      this.updating = false;
      this.dispatchEvent(
        new Event(this.failure === "error" ? "error" : "updateend"),
      );
    });
  }
  abort() {
    this.updating = false;
  }
}
class SourceFixture extends EventTarget {
  static isTypeSupported = () => true;
  static last: SourceFixture;
  readyState = "closed";
  buffer = new BufferFixture();
  constructor() {
    super();
    SourceFixture.last = this;
  }
  addSourceBuffer() {
    return this.buffer;
  }
  endOfStream() {
    this.readyState = "ended";
  }
  open() {
    this.readyState = "open";
    this.dispatchEvent(new Event("sourceopen"));
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("MediaSource", SourceFixture);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () => new Response(new Uint8Array([1, 2, 3]))),
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fixture");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("appends all five actual buffers in sequence and disposes exactly once", async () => {
  const media = await splice(
    ["D", "B", "A", "C"],
    new AbortController().signal,
  );
  SourceFixture.last.open();
  await media.ready;
  expect(SourceFixture.last.buffer.mode).toBe("segments");
  expect(SourceFixture.last.buffer.offsets).toEqual([
    0,
    8 / 15,
    38 / 15,
    68 / 15,
    98 / 15,
  ]);
  expect(SourceFixture.last.readyState).toBe("ended");
  expect(vi.getTimerCount()).toBe(0);
  media.dispose();
  media.dispose();
  expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(media.url);
});
it.each(["throw", "error"] as const)(
  "rejects an append %s and releases its URL/listeners/timers",
  async (failure) => {
    const media = await splice(
      ["A", "B", "C", "D"],
      new AbortController().signal,
    );
    SourceFixture.last.buffer.failure = failure;
    const rejected = expect(media.ready).rejects.toThrow();
    SourceFixture.last.open();
    await rejected;
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  },
);
it("bounds unopened media and aborts sourceopen without a late append", async () => {
  const controller = new AbortController();
  const media = await splice(["A", "B", "C", "D"], controller.signal);
  const rejected = expect(media.ready).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  await rejected;
  SourceFixture.last.open();
  expect(SourceFixture.last.buffer.offsets).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
  expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
  const next = await splice(["A", "B", "C", "D"], new AbortController().signal);
  const timeout = expect(next.ready).rejects.toThrow("MediaSource failed");
  await vi.advanceTimersByTimeAsync(15_000);
  await timeout;
  expect(vi.getTimerCount()).toBe(0);
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});
it("rejects unavailable bytes and an aborted fetch before allocating a media URL", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
  await expect(
    splice(["A", "B", "C", "D"], new AbortController().signal),
  ).rejects.toThrow("Reel unavailable");
  const controller = new AbortController();
  controller.abort();
  await expect(
    splice(["A", "B", "C", "D"], controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
