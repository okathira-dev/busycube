import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { chromium } from "@playwright/test";

const [
  beforeDirectory,
  afterDirectory,
  route = "/?locale=en",
  mode = "direct",
] = process.argv.slice(2);
if (!beforeDirectory || !afterDirectory)
  throw new Error(
    "Usage: measure-build-performance.mjs BEFORE_CLIENT_DIRECTORY AFTER_CLIENT_DIRECTORY [ROUTE] [direct|navigate]",
  );
if (!["direct", "navigate"].includes(mode))
  throw new Error("Invalid measurement mode");
const stageId = new URL(route, "http://localhost").searchParams.get("stage");
const routeUrl = new URL(route, "http://localhost");
const mainView = routeUrl.searchParams.get("view");
const isTool = routeUrl.pathname.startsWith("/tools/s710/");
const readySelector = stageId
  ? ".stage-view__play-area"
  : isTool
    ? 'input[type="file"]'
    : mainView === "settings"
      ? "#busycube-settings-heading"
      : mainView === "about"
        ? "#busycube-about-heading"
        : "#busycube-stages-heading";
if (mode === "navigate" && !/^S-\d{3}$/.test(stageId ?? ""))
  throw new Error("navigate mode requires a stage route");

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};
const variants = [
  { label: "before", root: resolve(beforeDirectory), port: 4180 },
  { label: "after", root: resolve(afterDirectory), port: 4181 },
];
const servers = variants.map(({ root, port }) => {
  const server = createServer(async (request, response) => {
    try {
      let file = resolve(
        root,
        "." +
          decodeURIComponent(new URL(request.url, "http://localhost").pathname),
      );
      if (!file.startsWith(root + sep) && file !== root)
        throw Error("outside root");
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      const type = types[extname(file)] ?? "application/octet-stream";
      let body = await readFile(file);
      response.setHeader("Content-Type", type);
      response.setHeader(
        "Cache-Control",
        file.includes(`${sep}assets${sep}`)
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
      if (
        /text|json|svg/.test(type) &&
        /\bbr\b/.test(request.headers["accept-encoding"] ?? "")
      ) {
        body = brotliCompressSync(body, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
        });
        response.setHeader("Content-Encoding", "br");
        response.setHeader("Vary", "Accept-Encoding");
      }
      response.setHeader("Content-Length", body.length);
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });
  server.listen(port, "127.0.0.1");
  return server;
});
let browser;
const results = [];
try {
  browser = await chromium.launch({
    channel: process.env.BUSYCUBE_MEASURE_BROWSER,
    headless: true,
  });
  for (let round = 0; round < 5; round++) {
    for (const variant of round % 2 ? [...variants].reverse() : variants) {
      const context = await browser.newContext({
        serviceWorkers: "block",
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        let shiftWindowStart = 0;
        let lastShift = 0;
        let shiftWindowValue = 0;
        window.bundleLabMetrics = {
          lcpMs: null,
          cls: PerformanceObserver.supportedEntryTypes.includes("layout-shift")
            ? 0
            : null,
          longTaskCount: PerformanceObserver.supportedEntryTypes.includes(
            "longtask",
          )
            ? 0
            : null,
          longTaskMs: PerformanceObserver.supportedEntryTypes.includes(
            "longtask",
          )
            ? 0
            : null,
        };
        for (const type of [
          "largest-contentful-paint",
          "layout-shift",
          "longtask",
        ]) {
          if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (type === "largest-contentful-paint")
                window.bundleLabMetrics.lcpMs = entry.startTime;
              else if (type === "layout-shift" && !entry.hadRecentInput) {
                if (
                  entry.startTime - lastShift > 1000 ||
                  entry.startTime - shiftWindowStart > 5000
                ) {
                  shiftWindowStart = entry.startTime;
                  shiftWindowValue = entry.value;
                } else shiftWindowValue += entry.value;
                lastShift = entry.startTime;
                window.bundleLabMetrics.cls = Math.max(
                  window.bundleLabMetrics.cls,
                  shiftWindowValue,
                );
              } else if (type === "longtask") {
                window.bundleLabMetrics.longTaskCount++;
                window.bundleLabMetrics.longTaskMs += entry.duration;
              }
            }
          }).observe({ type, buffered: true });
        }
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      let startedMs = 0;
      let initialMetrics = {};
      if (mode === "navigate") {
        await page.goto(`http://127.0.0.1:${variant.port}/?locale=en`);
        await page.locator("#busycube-stages-heading").waitFor();
        const action = page.locator(
          `[data-stage-id="${stageId}"] .stage-card__action`,
        );
        await action.scrollIntoViewIfNeeded();
        await action.evaluate((element) =>
          element.addEventListener(
            "click",
            () => performance.mark("busycube-navigation-start"),
            { once: true, capture: true },
          ),
        );
        initialMetrics = Object.fromEntries(
          (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
            m.name,
            m.value,
          ]),
        );
        await action.click();
        startedMs = await page.evaluate(
          () =>
            performance.getEntriesByName("busycube-navigation-start")[0]
              .startTime,
        );
      } else await page.goto(`http://127.0.0.1:${variant.port}${route}`);
      await page.locator(readySelector).waitFor();
      const measured = await page.evaluate(async (startedMs) => {
        await new Promise(requestAnimationFrame);
        const entries = performance
          .getEntriesByType("resource")
          .filter(
            (e) =>
              e.startTime >= startedMs && /\.(?:js|css)(?:\?|$)/.test(e.name),
          );
        return {
          readyMs: performance.now() - startedMs,
          jsCssRequests: entries.length,
          jsCssEncodedBytes: entries.reduce(
            (sum, e) => sum + e.encodedBodySize,
            0,
          ),
          jsCssTransferBytes: entries.reduce(
            (sum, e) => sum + e.transferSize,
            0,
          ),
          fcpMs:
            performance.getEntriesByName("first-contentful-paint")[0]
              ?.startTime ?? null,
        };
      }, startedMs);
      const metrics = Object.fromEntries(
        (await cdp.send("Performance.getMetrics")).metrics.map((m) => [
          m.name,
          m.value,
        ]),
      );
      await page.waitForFunction(
        () => performance.getEntriesByName("first-contentful-paint").length > 0,
      );
      measured.fcpMs = await page.evaluate(
        () =>
          performance.getEntriesByName("first-contentful-paint")[0].startTime,
      );
      await page.waitForTimeout(100);
      Object.assign(
        measured,
        await page.evaluate(() => window.bundleLabMetrics),
      );
      measured.filterResponseMs = null;
      if (mode === "direct" && !stageId && !isTool && !mainView) {
        const search = page.getByRole("textbox", {
          name: "Search by model or stage name",
        });
        await search.evaluate((element) =>
          element.addEventListener(
            "input",
            () => performance.mark("busycube-filter-start"),
            { once: true, capture: true },
          ),
        );
        await search.fill("S-010");
        await page.waitForFunction(
          () => document.querySelectorAll(".stage-card").length === 1,
        );
        measured.filterResponseMs = await page.evaluate(async () => {
          await new Promise(requestAnimationFrame);
          return (
            performance.now() -
            performance.getEntriesByName("busycube-filter-start")[0].startTime
          );
        });
      }
      results.push({
        variant: variant.label,
        round,
        ...measured,
        scriptMs:
          (metrics.ScriptDuration - (initialMetrics.ScriptDuration ?? 0)) *
          1000,
        taskMs:
          (metrics.TaskDuration - (initialMetrics.TaskDuration ?? 0)) * 1000,
      });
      await context.close();
    }
  }
  const median = (values) => {
    const available = values
      .filter((value) => value !== null && value !== undefined)
      .sort((a, b) => a - b);
    return available.length
      ? available[Math.floor(available.length / 2)]
      : null;
  };
  const summary = {};
  for (const { label } of variants) {
    summary[label] = {};
    for (const key of [
      "readyMs",
      "jsCssRequests",
      "jsCssEncodedBytes",
      "jsCssTransferBytes",
      "fcpMs",
      "scriptMs",
      "taskMs",
      "lcpMs",
      "cls",
      "longTaskCount",
      "longTaskMs",
      "filterResponseMs",
    ])
      summary[label][key] = median(
        results.filter((r) => r.variant === label).map((r) => r[key]),
      );
  }
  const report = {
    browser: browser.version(),
    rounds: 5,
    compression: "Brotli quality 5",
    serviceWorkers: "blocked in this cold-load comparison",
    summary,
    results,
  };

  console.log(
    JSON.stringify(
      { route, mode, fcpScope: "initial document paint", ...report },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  for (const server of servers) server.close();
}
