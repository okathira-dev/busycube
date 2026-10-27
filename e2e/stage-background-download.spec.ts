import { mkdtempSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

test("native Background Fetch completes with every origin window closed; a separate debugger abort delivers a native abort receipt", async ({
  playwright,
}, info) => {
  test.skip(
    process.env.BUSYCUBE_E2E_NATIVE_BACKGROUND_DOWNLOAD !== "1",
    "Requires a browser environment whose background download service actually transfers data; default headless remains active at zero bytes.",
  );
  test.setTimeout(145000);
  const profile = mkdtempSync(
    resolve("node_modules/.cache/stage-review-tmp/bg-profile-"),
  );
  const context = await playwright.chromium.launchPersistentContext(profile, {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    ignoreDefaultArgs: ["--disable-background-networking"],
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const cdp = await context.newCDPSession(page);
    await cdp.send("Browser.setPermission", {
      permission: { name: "background-fetch" },
      setting: "granted",
      origin: "http://127.0.0.1:4173",
    });
    await page.goto("/?locale=en&stage=S-960");
    const gifts = page.locator(".s960-stage .gift-box");
    await expect(gifts).toHaveCount(2);
    await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
    await gifts.nth(0).click();
    await expect(page.getByRole("status")).toHaveText("Waiting");
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const registration =
              await navigator.serviceWorker.getRegistration(
                "/background-fetch/",
              );
            if (!registration) return false;
            const manager = Reflect.get(registration, "backgroundFetch"),
              ids: string[] = await manager.getIds();
            const id = ids.find((id) => id.startsWith("busycube-s960-"));
            if (!id) return false;
            const download = await manager.get(id);
            return (
              !!download &&
              download.result === "" &&
              download.downloadTotal === 65536
            );
          }),
        { timeout: 15000 },
      )
      .toBe(true);
    await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
    const source = context
      .serviceWorkers()
      .find((worker) =>
        worker.url().endsWith("/background-fetch/download-sw.js"),
      );
    expect(source).toBeDefined();
    await page.screenshot({ path: info.outputPath("download-progress.png") });
    await page.goto("about:blank");
    // The fixed stream needs ~88 seconds. Elapsed time grants no credit: the
    // subsequent assertions require the worker's real native-event receipt.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 95000);
    });
    await page.goto("http://127.0.0.1:4173/?locale=en&stage=S-960");
    await info.attach("native-download-state.json", {
      contentType: "application/json",
      body: JSON.stringify(
        await page.evaluate(async () => {
          const cache = await caches.open("busycube-s960-download-v1"),
            state = await (
              await cache.match(
                `${location.origin}/background-fetch/state.json`,
              )
            )?.json();
          const registration =
              await navigator.serviceWorker.getRegistration(
                "/background-fetch/",
              ),
            manager = registration
              ? Reflect.get(registration, "backgroundFetch")
              : null;
          const ids: string[] = manager ? await manager.getIds() : [];
          const downloads = await Promise.all(
            ids.map(async (id) => {
              const download = await manager.get(id);
              return {
                id,
                downloaded: download?.downloaded,
                downloadTotal: download?.downloadTotal,
                result: download?.result,
                failureReason: download?.failureReason,
              };
            }),
          );
          return { state, downloads };
        }),
      ),
    });
    await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "open");
    await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
    const receipt = await page.evaluate(async () => {
      const cache = await caches.open("busycube-s960-download-v1");
      return (
        await cache.match(`${location.origin}/background-fetch/state.json`)
      )?.json();
    });
    expect(receipt.status).toBe("success");
    expect(receipt.successId).toBe(receipt.id);
    expect(receipt.abortId).toBeNull();
    await gifts.nth(1).click();
    await expect(page.getByRole("status")).toHaveText("Waiting");
    const worker = context
      .serviceWorkers()
      .find((worker) =>
        worker.url().endsWith("/background-fetch/download-sw.js"),
      );
    if (!worker) throw new Error("Missing native download worker");
    // This is a test-only external debugger operation. Product code has no abort
    // path. It validates native abort delivery, not the browser download UI.
    const aborted = await worker.evaluate(async () => {
      const manager = Reflect.get(
        Reflect.get(globalThis, "registration"),
        "backgroundFetch",
      );
      const ids: string[] = await manager.getIds();
      const id = ids.find((id) => id.startsWith("busycube-s960-"));
      if (!id) throw new Error("No current fetch");
      return (await manager.get(id)).abort();
    });
    expect(aborted).toBe(true);
    await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "open");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath("download-mobile.png") });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "closed");
    await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "closed");
  } finally {
    await context.close();
  }
});

test("a test-only external debugger abort produces a native receipt; registration alone never clears and game code has no abort control", async ({
  page,
  context,
}, info) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Browser.setPermission", {
    permission: { name: "background-fetch" },
    setting: "granted",
    origin: "http://127.0.0.1:4173",
  });
  await page.goto("/?locale=en&stage=S-960");
  const gifts = page.locator(".s960-stage .gift-box");
  await expect(gifts).toHaveCount(2);
  const stream = await page.evaluate(async () => {
    const response = await fetch(
      "/background-fetch/parcel.bin?trial=stream-check",
    );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No product stream");
    const started = performance.now(),
      chunks: { bytes: number; elapsed: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const part = await reader.read();
      if (part.done || !part.value) throw new Error("Short product stream");
      chunks.push({
        bytes: part.value.length,
        elapsed: performance.now() - started,
      });
    }
    await reader.cancel();
    return {
      status: response.status,
      size: response.headers.get("Content-Length"),
      chunks,
    };
  });
  expect(stream.status).toBe(200);
  expect(stream.size).toBe("65536");
  expect(stream.chunks.map((part) => part.bytes)).toEqual([1024, 1024, 1024]);
  expect(stream.chunks[2]?.elapsed).toBeGreaterThan(2000);
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
  await gifts.nth(1).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration =
          await navigator.serviceWorker.getRegistration("/background-fetch/");
        if (!registration) return false;
        return (
          (await Reflect.get(registration, "backgroundFetch").getIds())
            .length === 1
        );
      }),
    )
    .toBe(true);
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
  expect(await page.locator(".s960-stage").getByRole("button").count()).toBe(2);
  const worker = context
    .serviceWorkers()
    .find((worker) =>
      worker.url().endsWith("/background-fetch/download-sw.js"),
    );
  if (!worker) throw new Error("Missing native worker");
  expect(
    await worker.evaluate(async () => {
      const manager = Reflect.get(
        Reflect.get(globalThis, "registration"),
        "backgroundFetch",
      );
      const ids = await manager.getIds();
      return (await manager.get(ids[0])).abort();
    }),
  ).toBe(true);
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "open");
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
  await page.screenshot({ path: info.outputPath("download-native-abort.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("download-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "closed");
});
