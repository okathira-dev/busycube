type FetchLike = typeof fetch;

export async function checkMediaDelivery(
  origin: URL,
  paths: readonly string[],
  fetchImpl: FetchLike = fetch,
): Promise<
  Array<{
    path: string;
    status: number;
    returnedBytes: number;
    totalBytes: number;
  }>
> {
  if (paths.length === 0) throw new Error("配布物のmediaがありません。");
  const results = [];
  for (const path of paths) {
    const url = new URL(path, origin);
    const head = await fetchImpl(url, {
      method: "HEAD",
      headers: { "Accept-Encoding": "identity" },
    });
    if (head.status !== 200)
      throw new Error(`${path}: media HEADがHTTP ${head.status}を返しました。`);
    requireMime(
      head,
      path.endsWith(".webm")
        ? ["video/webm"]
        : path.endsWith(".mp4")
          ? ["video/mp4"]
          : ["application/octet-stream"],
    );
    const headLength = head.headers.get("content-length");
    const size = headLength === null ? null : Number(headLength);
    if (size !== null && (!Number.isSafeInteger(size) || size < 64))
      throw new Error(`${path}: mediaの長さが不正です。`);
    requireHeader(head, "etag");
    const cache = directives(head);
    if (
      !cache.has("immutable") ||
      !cache.has("max-age=31536000") ||
      !cache.has("public")
    )
      throw new Error(`${path}: media cache設定が不正です。`);
    const range = await fetchImpl(url, {
      headers: { Range: "bytes=0-63", "Accept-Encoding": "identity" },
    });
    const bytes = await range.arrayBuffer();
    // Static AssetsはRangeを無視して完全な200を返すことがある。現行mediaは
    // 全体読込でも機能するため記録し、206の場合は範囲の整合性を厳密に検査する。
    if (range.status === 200) {
      if (bytes.byteLength < 64 || (size !== null && bytes.byteLength !== size))
        throw new Error(`${path}: media全体の長さが不正です。`);
      requireMime(
        range,
        path.endsWith(".webm")
          ? ["video/webm"]
          : path.endsWith(".mp4")
            ? ["video/mp4"]
            : ["application/octet-stream"],
      );
      results.push({
        path,
        status: 200,
        returnedBytes: bytes.byteLength,
        totalBytes: bytes.byteLength,
      });
      continue;
    }
    const contentRange = range.headers
      .get("content-range")
      ?.match(/^bytes 0-63\/(\d+)$/);
    const total = contentRange ? Number(contentRange[1]) : NaN;
    if (
      range.status !== 206 ||
      !Number.isSafeInteger(total) ||
      total < 64 ||
      (size !== null && total !== size) ||
      bytes.byteLength !== 64
    )
      throw new Error(
        `${path}: media Range応答が不正です（HTTP ${range.status}、${bytes.byteLength} bytes）。`,
      );
    results.push({
      path,
      status: 206,
      returnedBytes: bytes.byteLength,
      totalBytes: total,
    });
  }
  return results;
}

function requireHeader(response: Response, name: string): string {
  const value = response.headers.get(name);
  if (!value)
    throw new Error(
      `${response.url || "配信response"}: ${name} headerがありません。`,
    );
  return value;
}

function requireMime(response: Response, allowed: readonly string[]): void {
  const mime = requireHeader(response, "content-type")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!allowed.includes(mime)) throw new Error(`配信MIMEが不正です: ${mime}`);
}

function directives(response: Response): Set<string> {
  return new Set(
    requireHeader(response, "cache-control")
      .toLowerCase()
      .split(",")
      .map((value) => value.trim()),
  );
}

async function get(
  url: URL,
  fetchImpl: FetchLike,
  headers?: HeadersInit,
): Promise<Response> {
  const response = await fetchImpl(url, { headers });
  if (response.status !== 200) {
    await response.arrayBuffer();
    throw new Error(`${url.href}: HTTP ${response.status}（期待値200）`);
  }
  return response;
}

// 容量制限ではなく、HTMLとその参照assetが同じreleaseとして配信できるかを確認する。
export async function checkStaticDelivery(
  origin: URL,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const assets = new Set<string>();
  for (const path of ["/", "/?stage=S-090", "/tools/s710/"]) {
    const response = await get(new URL(path, origin), fetchImpl);
    const html = await response.text();
    requireMime(response, ["text/html"]);
    const cache = directives(response);
    if (
      !(
        cache.has("no-cache") ||
        (cache.has("max-age=0") && cache.has("must-revalidate"))
      )
    ) {
      throw new Error(`${path}: HTMLが再検証されるcache設定ではありません。`);
    }
    const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], new URL(path, origin)))
      .filter(
        (url) =>
          url.origin === origin.origin &&
          /^\/assets\/.+\.(?:js|css)$/.test(url.pathname),
      );
    if (!references.some((url) => url.pathname.endsWith(".js"))) {
      throw new Error(`${path}: entry JSへの参照がありません。`);
    }
    for (const url of references) assets.add(url.href);
  }
  for (const href of assets) {
    const url = new URL(href);
    const response = await get(url, fetchImpl);
    await response.arrayBuffer();
    requireMime(
      response,
      url.pathname.endsWith(".css")
        ? ["text/css"]
        : ["text/javascript", "application/javascript"],
    );
    const cache = directives(response);
    if (
      !cache.has("public") ||
      !cache.has("immutable") ||
      !cache.has("max-age=31536000")
    ) {
      throw new Error(`${href}: hash付きassetのcache設定が不正です。`);
    }
    const etag = requireHeader(response, "etag");
    const conditional = await fetchImpl(url, {
      headers: { "If-None-Match": etag },
    });
    await conditional.arrayBuffer();
    if (conditional.status !== 304)
      throw new Error(
        `${href}: ETag再検証がHTTP ${conditional.status}を返しました（期待値304）。`,
      );
  }
  const missing = await fetchImpl(
    new URL("/assets/missing-build-deadbeef.js", origin),
  );
  await missing.arrayBuffer();
  if (missing.status !== 404)
    throw new Error(
      `存在しないJSがHTTP ${missing.status}を返しました（期待値404）。`,
    );
}
