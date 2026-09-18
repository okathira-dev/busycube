import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import jsQR from "jsqr";

test("replaces the QR payload in real converted video frames", async ({
  page,
}) => {
  await page.goto("/tools/s710/?locale=en");
  await page
    .locator('input[type="file"]')
    .setInputFiles(resolve("src/fixtures/s710/assets/qr-frame-input.webm"));
  await page.getByRole("button", { name: "COMPRESS →", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Done — output size ratio",
  );
  const video = page.locator("video").last();
  await expect
    .poll(() =>
      video.evaluate((element) =>
        element instanceof HTMLVideoElement ? element.readyState : 0,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  const frame = await video.evaluate(async (element) => {
    if (!(element instanceof HTMLVideoElement))
      throw new Error("output video unavailable");
    await new Promise<void>((resolve) => {
      element.addEventListener("seeked", () => resolve(), { once: true });
      element.currentTime = 4.5;
    });
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("frame canvas unavailable");
    context.drawImage(element, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      data: Array.from(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
    };
  });
  expect(
    jsQR(new Uint8ClampedArray(frame.data), frame.width, frame.height)?.data,
  ).toBe("busycube{qr_replaced}");
});

test("updates the memoized catalogue after language, search and real progress changes", async ({
  page,
}) => {
  await page.goto("/?locale=en");
  await page.getByRole("combobox", { name: "Language", exact: true }).click();
  await page.getByRole("option", { name: "日本語", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "箱の部屋", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Language", exact: true }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search by model or stage name" })
    .fill("S-010");
  await expect(page.locator(".stage-card")).toHaveCount(1);
  await page.locator('[data-stage-id="S-010"] .stage-card__action').click();
  await page.getByRole("button", { name: /Mouse box/ }).click();
  await page.goBack();
  await expect(page.locator('[data-stage-id="S-010"]')).toHaveAttribute(
    "data-progress",
    "partial",
  );
  await expect(
    page.locator('[data-stage-id="S-010"] .stage-card__progress'),
  ).toHaveText("1/3");
});

test("navigates with history and exposes meaningful metadata", async ({
  page,
}) => {
  await page.goto("/?locale=en");
  await expect(
    page.getByRole("heading", { name: "Busycube", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/view=settings/);
  await expect(page).toHaveTitle("Settings | Busycube: Web API Explorer");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeFocused();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Box room" })).toBeVisible();
});

test("loads settings on demand and focuses a delayed direct entry", async ({
  page,
}) => {
  const settingsRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/SettingsView-[^/]+\.js$/.test(request.url()))
      settingsRequests.push(request.url());
  });
  await page.goto("/?locale=en");
  await expect(page.getByRole("heading", { name: "Box room" })).toBeVisible();
  expect(settingsRequests).toEqual([]);
  await page.route("**/assets/SettingsView-*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  await page.goto("/?view=settings&locale=en");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeFocused();
  expect(settingsRequests.length).toBeGreaterThan(0);
});

test("keeps navigation available when a view chunk cannot load", async ({
  page,
}) => {
  await page.route("**/assets/SettingsView-*.js", (route) => route.abort());
  await page.goto("/?view=settings&locale=en");
  await expect(page.getByRole("alert")).toContainText(
    "This view could not be loaded",
  );
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Box room", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Box room" })).toBeVisible();
});

test("restores progress from IndexedDB after reload", async ({ page }) => {
  await page.goto("/?locale=en");
  await expect(page.getByText(/Opened boxes:/)).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-progress-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("documents", "readwrite");
      transaction.objectStore("documents").put(
        {
          schemaVersion: 1,
          installationId: "e2e-installation",
          stages: { "S-000": { solvedBoxIds: ["B01"] } },
          settings: { locale: "en" },
        },
        "current",
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.getByText("Opened boxes: 1 / 204")).toBeVisible();
});

test("has no serious or critical automated accessibility violations", async ({
  page,
}) => {
  await page.goto("/?locale=en");
  await expect(page.getByRole("heading", { name: "Box room" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});

test("does not download the XR renderer without an immersive device", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: { isSessionSupported: async () => false },
    });
  });
  const rendererRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/xrRenderer-[^/]+\.js$/.test(request.url()))
      rendererRequests.push(request.url());
  });
  await page.goto("/?stage=S-730&locale=en");
  await expect(
    page.getByText("No immersive AR or VR device is available.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(rendererRequests).toEqual([]);
});

test("prepares the XR renderer without requesting a session until the user acts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: {
        isSessionSupported: async () => true,
        requestSession: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
  });
  const renderer = page.waitForResponse(/\/xrRenderer-[^/]+\.js$/);
  await page.goto("/?stage=S-730&locale=en");
  expect((await renderer).ok()).toBe(true);
  await expect(
    page.getByText(
      "Connect a supported device and enter through the browser XR prompt.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enter immersive XR", exact: true })
    .click();
  await expect(
    page.getByText("XR entry was cancelled or failed.", { exact: true }),
  ).toBeVisible();
});

test("reopens a visited lazy view offline and recovers from an unvisited view", async ({
  page,
  context,
}) => {
  await page.goto("/?locale=en");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    }
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Box room", exact: true }).click();
  const cachedAssets = await page.evaluate(async () => {
    const names = await caches.keys();
    const result: Record<string, string[]> = {};
    for (const name of names)
      result[name] = (await (await caches.open(name)).keys()).map(
        (request) => request.url,
      );
    return result;
  });
  expect(
    Object.values(cachedAssets)
      .flat()
      .some((url) => /\/SettingsView-[^/]+\.js$/.test(url)),
  ).toBe(true);
  await context.setOffline(true);
  await page.goto("/?view=settings&locale=en");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "This view could not be loaded",
  );
  await page.getByRole("link", { name: "Box room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Box room", exact: true }),
  ).toBeVisible();
});

test("recovers a missing stage chunk through an explicit reload", async ({
  page,
}) => {
  await page.route("**/assets/stage-*.js", (route) => route.abort());
  await page.goto("/?stage=S-000&locale=en");
  await expect(page.getByRole("alert")).toContainText(
    "This box stopped responding",
  );
  await page.unroute("**/assets/stage-*.js");
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await expect(page.locator(".stage-view__play-area")).toBeVisible();
});

test("converts the fixed WebM input through the video recovery route", async ({
  page,
}) => {
  await page.goto("/?stage=S-720&locale=en");
  await page
    .getByRole("button", { name: "Connect video source output 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Connect transform input t1a", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Connect transform output t1a", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Connect video output input", exact: true })
    .click();
  await expect(page.getByText("Output ready.", { exact: true })).toBeVisible();
  await expect(page.locator('video[src^="blob:"]')).toHaveJSProperty(
    "readyState",
    4,
  );
});

for (const [format, fixture] of [
  ["WebM", "src/fixtures/video-recovery/assets/source-t1.webm"],
  ["MP4", "src/fixtures/media/assets/multi-audio.mp4"],
]) {
  test(`compresses a ${format} clip in the separate S710 tool`, async ({
    page,
  }) => {
    await page.goto("/tools/s710/?locale=en");
    await page.locator('input[type="file"]').setInputFiles(resolve(fixture));
    await page.getByRole("button", { name: "COMPRESS →", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      "Done — output size ratio",
    );
    await expect(
      page.getByRole("link", { name: "Download WebM", exact: true }),
    ).toBeVisible();
  });
}
