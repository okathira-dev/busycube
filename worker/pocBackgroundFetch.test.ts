import { createPocDownload, POC_DOWNLOAD_BYTES } from "./pocBackgroundFetch";

describe("bounded Background Fetch PoC response", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("streams exactly 64KiB over about 90 seconds with no cache or compression", async () => {
    const response = createPocDownload(
      new Request("https://busycube.example/poc/background-fetch/slow.bin"),
    );
    expect(response.headers.get("Content-Length")).toBe(
      String(POC_DOWNLOAD_BYTES),
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-transform",
    );
    const reader = response.body?.getReader();
    expect((await reader?.read())?.value?.length).toBe(1024);
    const remaining = new Response(
      new ReadableStream({
        async start(controller) {
          for (;;) {
            const next = await reader?.read();
            if (!next || next.done) break;
            controller.enqueue(next.value);
          }
          controller.close();
        },
      }),
    ).arrayBuffer();
    await vi.advanceTimersByTimeAsync(88_200);
    const bytes = new Uint8Array(await remaining);
    expect(bytes.length).toBe(POC_DOWNLOAD_BYTES - 1024);
    expect(bytes.every((byte, index) => byte === (index + 1024) % 251)).toBe(
      true,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops scheduled work when the consumer cancels", async () => {
    const response = createPocDownload(
      new Request("https://busycube.example/poc/background-fetch/slow.bin"),
    );
    const reader = response.body?.getReader();
    await reader?.read();
    await reader?.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns no body or timer for a HEAD probe", () => {
    const response = createPocDownload(
      new Request("https://busycube.example/poc/background-fetch/slow.bin", {
        method: "HEAD",
      }),
    );
    expect(response.body).toBeNull();
    expect(response.headers.get("Content-Length")).toBe(
      String(POC_DOWNLOAD_BYTES),
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("serves a resumed final range with the same absolute bytes", async () => {
    const response = createPocDownload(
      new Request("https://busycube.example/poc/background-fetch/slow.bin", {
        headers: { Range: "bytes=65024-" },
      }),
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(
      "bytes 65024-65535/65536",
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.length).toBe(512);
    expect(bytes.every((byte, index) => byte === (65024 + index) % 251)).toBe(
      true,
    );
  });

  it.each(["bytes=65536-", "bytes=10-1", "bytes=-5", "bytes=0-1,4-5"])(
    "rejects an unsupported or impossible range %s",
    (range) => {
      const response = createPocDownload(
        new Request("https://busycube.example/poc/background-fetch/slow.bin", {
          headers: { Range: range },
        }),
      );
      expect(response.status).toBe(416);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
