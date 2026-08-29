import {
  fetchJsonWithRetry,
  isVersionFullyDeployed,
  resolveVersion,
  resolveWorkersDevUrls,
  runSmokeTests,
} from "./cloudflare-ci.ts";

const versionPayload = (
  items: Array<{
    annotations?: Record<string, string>;
    id: string;
  }>,
) => ({ result: { items } });

describe("resolveVersion", () => {
  test("一致するVersionがなければundefinedを返す", () => {
    expect(resolveVersion(versionPayload([]), "main-1-2")).toBeUndefined();
  });

  test("tagとmessageが一致するVersionを返す", () => {
    expect(
      resolveVersion(
        versionPayload([
          {
            id: "version-id",
            annotations: {
              "workers/tag": "main-1-2",
              "workers/message": "expected-message",
            },
          },
        ]),
        "main-1-2",
        "expected-message",
      ),
    ).toEqual({
      id: "version-id",
      tag: "main-1-2",
      message: "expected-message",
    });
  });

  test("同じtagのVersionが複数あれば失敗する", () => {
    expect(() =>
      resolveVersion(
        versionPayload([
          { id: "version-a", annotations: { "workers/tag": "duplicate" } },
          { id: "version-b", annotations: { "workers/tag": "duplicate" } },
        ]),
        "duplicate",
      ),
    ).toThrow("複数のVersionに一致");
  });

  test("messageが一致しなければ失敗する", () => {
    expect(() =>
      resolveVersion(
        versionPayload([
          {
            id: "version-id",
            annotations: {
              "workers/tag": "main-1-2",
              "workers/message": "different-message",
            },
          },
        ]),
        "main-1-2",
        "expected-message",
      ),
    ).toThrow("messageが期待値と一致しません");
  });

  test("API responseの構造が不正なら失敗する", () => {
    expect(() => resolveVersion({ result: [] }, "main-1-2")).toThrow(
      "API resultがobjectではありません",
    );
  });
});

describe("isVersionFullyDeployed", () => {
  test("対象Versionだけが100%ならtrueを返す", () => {
    expect(
      isVersionFullyDeployed(
        {
          result: {
            deployments: [
              {
                versions: [{ version_id: "target-version", percentage: 100 }],
              },
            ],
          },
        },
        "target-version",
      ),
    ).toBe(true);
  });

  test("別Versionまたはtraffic分割ならfalseを返す", () => {
    expect(
      isVersionFullyDeployed(
        {
          result: {
            deployments: [
              {
                versions: [
                  { version_id: "target-version", percentage: 50 },
                  { version_id: "other-version", percentage: 50 },
                ],
              },
            ],
          },
        },
        "target-version",
      ),
    ).toBe(false);
  });

  test("Deploymentがなければfalseを返す", () => {
    expect(
      isVersionFullyDeployed({ result: { deployments: [] } }, "target-version"),
    ).toBe(false);
  });
});

describe("resolveWorkersDevUrls", () => {
  test("本番URLとPreview Alias URLを組み立てる", () => {
    expect(
      resolveWorkersDevUrls(
        { result: { subdomain: "account-name" } },
        "busycube",
        "pr-15",
      ),
    ).toEqual({
      productionUrl: "https://busycube.account-name.workers.dev",
      previewUrl: "https://pr-15-busycube.account-name.workers.dev",
    });
  });

  test("不正なPreview Aliasを拒否する", () => {
    expect(() =>
      resolveWorkersDevUrls(
        { result: { subdomain: "account-name" } },
        "busycube",
        "Invalid_Alias",
      ),
    ).toThrow("Preview Aliasに使用できない文字");
  });
});

describe("fetchJsonWithRetry", () => {
  test("一時的なserver errorだけをretryする", async () => {
    const fetchImpl = jest
      .fn<Promise<Response>, [URL | RequestInfo, RequestInit?]>()
      .mockResolvedValueOnce(new Response("temporary", { status: 503 }))
      .mockResolvedValueOnce(
        new Response('{"result":{"ok":true}}', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    await expect(
      fetchJsonWithRetry(
        new URL("https://api.cloudflare.com/test"),
        "token",
        fetchImpl,
        async () => {},
      ),
    ).resolves.toEqual({ result: { ok: true } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("client errorはretryしない", async () => {
    const fetchImpl = jest.fn(async () =>
      Promise.resolve(new Response("bad request", { status: 400 })),
    );

    await expect(
      fetchJsonWithRetry(
        new URL("https://api.cloudflare.com/test"),
        "token",
        fetchImpl,
        async () => {},
      ),
    ).rejects.toThrow("HTTP 400");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("runSmokeTests", () => {
  test("共通endpointとheaderを確認する", async () => {
    const requestedUrls: string[] = [];
    const fetchImpl = jest.fn(
      async (input: URL | RequestInfo, init?: RequestInit) => {
        const url = String(input);
        requestedUrls.push(url);
        const path = new URL(url).pathname;
        const headers = new Headers();
        if (path === "/") {
          headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
          headers.set("X-Content-Type-Options", "nosniff");
          headers.set("X-Frame-Options", "SAMEORIGIN");
        } else if (
          path === "/manifest.webmanifest" ||
          path === "/service-worker.js"
        ) {
          headers.set("Cache-Control", "no-cache");
        } else if (path === "/offline-beacon/network-probe") {
          headers.set("Cache-Control", "no-store");
          headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
          headers.set("X-Content-Type-Options", "nosniff");
        } else if (path === "/payment/method") {
          expect(init?.method).toBe("HEAD");
          headers.set("Cache-Control", "no-store");
          headers.set(
            "Link",
            '</payment/payment-method-manifest.json>; rel="payment-method-manifest"',
          );
        }
        const status =
          path === "/offline-beacon/network-probe" || path === "/payment/method"
            ? 204
            : 200;
        return new Response(null, { status, headers });
      },
    );

    await runSmokeTests("https://preview.example", fetchImpl, async () => {});

    expect(requestedUrls).toEqual([
      "https://preview.example/",
      "https://preview.example/?stage=S-090",
      "https://preview.example/manifest.webmanifest",
      "https://preview.example/service-worker.js",
      "https://preview.example/offline-beacon/network-probe",
      "https://preview.example/payment/method",
    ]);
  });

  test("一時的な失敗をretryする", async () => {
    let rootAttempts = 0;
    const fetchImpl = jest.fn(async (input: URL | RequestInfo) => {
      const path = new URL(String(input)).pathname;
      if (path === "/" && rootAttempts === 0) {
        rootAttempts += 1;
        return new Response(null, { status: 404 });
      }
      const headers = new Headers({
        "Cache-Control": path.includes("network-probe")
          ? "no-store"
          : "no-cache",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      });
      if (path === "/payment/method") {
        headers.set(
          "Link",
          '</payment/payment-method-manifest.json>; rel="payment-method-manifest"',
        );
        headers.set("Cache-Control", "no-store");
      }
      const status =
        path === "/offline-beacon/network-probe" || path === "/payment/method"
          ? 204
          : 200;
      return new Response(null, { status, headers });
    });

    await runSmokeTests("https://preview.example", fetchImpl, async () => {});

    expect(rootAttempts).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(7);
  });

  test("HTTPS以外のURLを拒否する", async () => {
    await expect(runSmokeTests("http://preview.example")).rejects.toThrow(
      "HTTPS URL",
    );
  });
});
