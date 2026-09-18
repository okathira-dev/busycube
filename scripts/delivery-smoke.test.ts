import { checkMediaDelivery, checkStaticDelivery } from "./delivery-smoke";

describe("checkMediaDelivery", () => {
  test("Rangeを無視した完全な200は取得量を報告する", async () => {
    const fetchImpl = vi.fn(
      async (_input: URL | RequestInfo, init?: RequestInit) =>
        init?.method === "HEAD"
          ? head()
          : new Response(new Uint8Array(1024), {
              headers: { "Content-Type": "video/webm" },
            }),
    );
    await expect(
      checkMediaDelivery(
        new URL("https://preview.example"),
        ["/assets/clip-abcdefgh.webm"],
        fetchImpl,
      ),
    ).resolves.toEqual([
      {
        path: "/assets/clip-abcdefgh.webm",
        status: 200,
        returnedBytes: 1024,
        totalBytes: 1024,
      },
    ]);
  });
  const head = () =>
    new Response(null, {
      headers: {
        "Content-Type": "video/webm",
        "Content-Length": "1024",
        ETag: '"media"',
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  test("media全体を取得せずHEADと64 bytesのRangeを確認する", async () => {
    const fetchImpl = vi.fn(
      async (_input: URL | RequestInfo, init?: RequestInit) =>
        init?.method === "HEAD"
          ? head()
          : new Response(new Uint8Array(64), {
              status: 206,
              headers: { "Content-Range": "bytes 0-63/1024" },
            }),
    );
    await checkMediaDelivery(
      new URL("https://preview.example"),
      ["/assets/clip-abcdefgh.webm"],
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      new URL("https://preview.example/assets/clip-abcdefgh.webm"),
      { headers: { Range: "bytes=0-63", "Accept-Encoding": "identity" } },
    );
  });
  test.each([
    [404, "bytes 0-63/1024", 64],
    [206, "bytes 0-63/2048", 64],
    [206, "bytes 0-63/1024", 63],
  ])(
    "不正なRange応答 %s / %s / %s bytesを拒否する",
    async (status, contentRange, size) => {
      const fetchImpl = vi.fn(
        async (_input: URL | RequestInfo, init?: RequestInit) =>
          init?.method === "HEAD"
            ? head()
            : new Response(new Uint8Array(size), {
                status,
                headers: { "Content-Range": contentRange },
              }),
      );
      await expect(
        checkMediaDelivery(
          new URL("https://preview.example"),
          ["/assets/clip-abcdefgh.webm"],
          fetchImpl,
        ),
      ).rejects.toThrow("Range応答");
    },
  );
});

function fixture(overrides: Record<string, Response> = {}) {
  return vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (overrides[path]) return overrides[path].clone();
    if (path === "/assets/missing-build-deadbeef.js")
      return new Response(null, { status: 404 });
    if (path.startsWith("/assets/")) {
      if (new Headers(init?.headers).has("If-None-Match"))
        return new Response(null, { status: 304 });
      return new Response("asset", {
        headers: {
          "content-type": path.endsWith(".css")
            ? "text/css"
            : "text/javascript; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
          etag: '"hash"',
        },
      });
    }
    return new Response(
      '<script type="module" src="/assets/entry-abcdefgh.js"></script><link href="/assets/entry-abcdefgh.css" rel="stylesheet">',
      {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control":
            path === "/" ? "public, max-age=0, must-revalidate" : "no-cache",
        },
      },
    );
  });
}

describe("checkStaticDelivery", () => {
  test("HTMLの参照を辿り、重複assetを一度検査しETagを再検証する", async () => {
    const fetchImpl = fixture();
    await checkStaticDelivery(new URL("https://preview.example"), fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(8);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://preview.example/assets/entry-abcdefgh.js"),
      { headers: { "If-None-Match": '"hash"' } },
    );
  });

  test.each([
    [
      "HTMLをimmutableにする",
      "/",
      new Response('<script src="/assets/entry-abcdefgh.js"></script>', {
        headers: {
          "content-type": "text/html",
          "cache-control": "public, max-age=31536000, immutable",
        },
      }),
      "HTML",
    ],
    [
      "entry参照がない",
      "/",
      new Response("<html></html>", {
        headers: { "content-type": "text/html", "cache-control": "no-cache" },
      }),
      "entry JS",
    ],
    [
      "JSにHTMLを返す",
      "/assets/entry-abcdefgh.js",
      new Response("<html></html>", {
        headers: { "content-type": "text/html" },
      }),
      "MIME",
    ],
    [
      "assetが消えている",
      "/assets/entry-abcdefgh.js",
      new Response(null, { status: 404 }),
      "HTTP 404",
    ],
    [
      "存在しないJSにSPA fallbackを返す",
      "/assets/missing-build-deadbeef.js",
      new Response("<html></html>"),
      "期待値404",
    ],
  ])("%sを拒否する", async (_name, path, response, message) => {
    await expect(
      checkStaticDelivery(
        new URL("https://preview.example"),
        fixture({ [path]: response }),
      ),
    ).rejects.toThrow(message);
  });

  test("条件付きGETが304を返さない場合に拒否する", async () => {
    const base = fixture();
    const fetchImpl = vi.fn(
      async (input: URL | RequestInfo, init?: RequestInit) =>
        new Headers(init?.headers).has("If-None-Match")
          ? new Response("asset")
          : base(input, init),
    );
    await expect(
      checkStaticDelivery(new URL("https://preview.example"), fetchImpl),
    ).rejects.toThrow("期待値304");
  });
});
