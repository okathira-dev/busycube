import { expect, type Page, test } from "@playwright/test";
import type { ProgressDocument } from "../src/domain/progress";

async function observeNative(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  await cdp.send("Browser.grantPermissions", {
    permissions: ["wakeLockScreen"],
    origin: "http://127.0.0.1:4173",
    browserContextId: targetInfo.browserContextId,
  });
  await page.addInitScript(() => {
    const request = navigator.wakeLock.request.bind(navigator.wakeLock);
    const sentinels: WakeLockSentinel[] = [];
    Reflect.set(window, "wakeNativeSentinels", sentinels);
    navigator.wakeLock.request = async (type) => {
      const sentinel = await request(type);
      sentinels.push(sentinel);
      return sentinel;
    };
  });
}
const gift = (page: Page) => page.locator(".problem-gift .gift-box");
const begin = (page: Page) =>
  page.getByRole("button", { name: /^Sun rays:/ }).click();

test("a real native sentinel must remain held for the full visible wait and legacy immediate clears are kept separately", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await observeNative(page);
  await page.goto("/privacy/index.html");
  await page.evaluate(async () => {
    const value: ProgressDocument = {
      schemaVersion: 1,
      installationId: "wake-fixture",
      stages: { "S-330": { solvedBoxIds: ["B01", "B02"] } },
      settings: { locale: "en" },
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("busycube-progress-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("documents");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("documents", "readwrite");
        tx.objectStore("documents").put(value, "current");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
    });
  });
  await page.goto("/?locale=en&stage=S-330");
  await expect(page.locator(".stage-view__header > p")).toHaveText(/^D-/);
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await expect(page.locator(".problem-gift")).toHaveCount(1);
  const start = await page.evaluate(() => performance.now());
  await begin(page);
  await expect(page.locator(".s330-puzzle")).toHaveAttribute(
    "data-holding",
    "true",
  );
  expect(
    await page.evaluate(
      () => Reflect.get(window, "wakeNativeSentinels")[0].released,
    ),
  ).toBe(false);
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  expect(await page.locator(".s330-puzzle").innerText()).not.toMatch(
    /62|second|秒/,
  );
  await page.screenshot({
    path: info.outputPath("wake-holding.png"),
    fullPage: true,
  });
  await expect(gift(page)).toHaveAttribute("data-box-state", "open", {
    timeout: 75_000,
  });
  expect(
    (await page.evaluate(() => performance.now())) - start,
  ).toBeGreaterThanOrEqual(62_000);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window, "wakeNativeSentinels").every(
          (s: WakeLockSentinel) => s.released,
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator(".s330-progress")).toHaveAttribute(
    "stroke-dashoffset",
    "0",
  );
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          new Promise<string[]>((resolve, reject) => {
            const request = indexedDB.open("busycube-progress-v1", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction("documents");
              const read = tx.objectStore("documents").get("current");
              read.onsuccess = () =>
                resolve(read.result.stages["S-330"].solvedBoxIds);
              tx.oncomplete = () => db.close();
            };
          }),
      ),
    )
    .toEqual(["B01", "B02", "B03"]);
});

test("manual release and navigation to the independent idle stage release real native sentinels", async ({
  page,
}, info) => {
  await observeNative(page);
  await page.goto("/?locale=en&stage=S-330");
  await begin(page);
  await expect(page.locator(".s330-puzzle")).toHaveAttribute(
    "data-holding",
    "true",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("wake-holding-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "wakeNativeSentinels")[0].released,
      ),
    )
    .toBe(true);
  await expect(page.locator(".s330-progress")).toHaveAttribute(
    "stroke-dashoffset",
    "100",
  );
  await begin(page);
  await expect(page.locator(".s330-puzzle")).toHaveAttribute(
    "data-holding",
    "true",
  );
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await page.locator('[data-stage-id="S-830"] .stage-card__action').click();
  await expect(page.locator(".s830-wait")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window, "wakeNativeSentinels").every(
          (s: WakeLockSentinel) => s.released,
        ),
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => Reflect.get(window, "wakeNativeSentinels").length,
    ),
  ).toBe(2);
});
