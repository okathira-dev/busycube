import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function uploadedPreview(output) {
  const uploads = output
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.type === "version-upload");
  if (uploads.length !== 1 || !uploads[0].version_id) {
    throw new Error("Expected exactly one uploaded Worker version.");
  }
  // Probe the immutable version URL, not an alias another run can replace.
  const url = new URL(uploads[0].preview_url);
  if (
    url.protocol !== "https:" ||
    !/^[a-f0-9]{8}-busycube\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error("Unexpected Worker version URL.");
  }
  return url.origin;
}

export function isAccessChallenge(response) {
  const location = response.headers.get("location");
  if (response.status !== 302 || !location) return false;
  const url = new URL(location);
  return (
    url.protocol === "https:" &&
    url.hostname.endsWith(".cloudflareaccess.com") &&
    url.pathname.startsWith("/cdn-cgi/access/login/")
  );
}

export async function checkPreview(url, request = fetch) {
  const checks = [
    ["/", 200, "text/html"],
    ["/offline-beacon/network-probe", 204, null],
    ["/payment/method", 204, null],
    ["/payment/payment-method-manifest.json", 200, "application/json"],
  ];
  for (const [path, status, contentType] of checks) {
    let response;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await request(new URL(path, url), {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      if (isAccessChallenge(response)) return "access-protected";
      if (response.status === status) break;
      if (attempt < 5) await new Promise((done) => setTimeout(done, 2000));
    }
    if (response.status !== status) {
      throw new Error(
        `Preview ${path}: expected ${status}, received ${response.status}.`,
      );
    }
    if (
      contentType &&
      !response.headers.get("content-type")?.includes(contentType)
    ) {
      throw new Error(`Preview ${path}: unexpected content type.`);
    }
    if (path === "/payment/method") {
      if (
        response.headers.get("link") !==
        '</payment/payment-method-manifest.json>; rel="payment-method-manifest"'
      ) {
        throw new Error("Worker payment manifest header is missing.");
      }
    }
    if (path === "/offline-beacon/network-probe") {
      if (response.headers.get("cache-control") !== "no-store") {
        throw new Error("Worker network probe must not be cached.");
      }
    }
    await response.body?.cancel();
  }
  return "passed";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const url = uploadedPreview(await readFile(process.argv[2], "utf8"));
  const result = await checkPreview(url);
  if (result === "access-protected") {
    console.warn(
      "::warning::Preview is protected by Cloudflare Access. Remote HTTP behavior requires interactive review; successful upload and CI runtime tests are the merge gate.",
    );
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `url=${url}\nresult=${result}\n`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Preview: ${url}\n\nHTTP smoke: ${result}.\n`,
    );
  }
}
