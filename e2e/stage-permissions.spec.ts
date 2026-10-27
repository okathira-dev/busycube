import { type BrowserContext, expect, type Page, test } from "@playwright/test";

const permissions = [
  "geolocation",
  "notifications",
  "camera",
  "microphone",
  "accelerometer",
  "gyroscope",
  "local-fonts",
  "clipboard-read",
  "idle-detection",
  "clipboard-write",
];
async function grantAll(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  await cdp.send("Browser.grantPermissions", {
    permissions: [
      "geolocation",
      "notifications",
      "videoCapture",
      "audioCapture",
      "sensors",
      "localFonts",
      "clipboardReadWrite",
      "clipboardSanitizedWrite",
      "idleDetection",
    ],
    origin: "http://127.0.0.1:4173",
    browserContextId: targetInfo.browserContextId,
  });
  // Permission overrides live with this CDP session, which the test context closes.
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const attempts: string[] = [];
    Reflect.set(window, "permissionAcquisitions", attempts);
    const forbidden = () => {
      attempts.push("acquisition");
      throw new Error(
        "Permission query must not acquire private data or start monitoring",
      );
    };
    navigator.geolocation.watchPosition = forbidden;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = forbidden;
    if (typeof Notification !== "undefined")
      Notification.requestPermission = forbidden;
    if (navigator.clipboard) {
      navigator.clipboard.readText = forbidden;
      navigator.clipboard.writeText = forbidden;
    }
    if (typeof Reflect.get(window, "queryLocalFonts") === "function")
      Reflect.set(window, "queryLocalFonts", forbidden);
    if (window.IdleDetector) window.IdleDetector.requestPermission = forbidden;
    if (typeof Accelerometer !== "undefined") {
      const Native = Accelerometer;
      Reflect.set(
        window,
        "Accelerometer",
        class extends Native {
          constructor(options?: SensorOptions) {
            super(options);
            forbidden();
          }
        },
      );
    }
    if (typeof Gyroscope !== "undefined") {
      const Native = Gyroscope;
      Reflect.set(
        window,
        "Gyroscope",
        class extends Native {
          constructor(options?: SensorOptions) {
            super(options);
            forbidden();
          }
        },
      );
    }
  });
});

test("opens all ten native initially granted permissions without acquiring data", async ({
  page,
  context,
}, testInfo) => {
  await grantAll(context, page);
  await page.goto("/?locale=en&stage=S-650");
  await expect(page.locator(".s650-permission")).toHaveCount(10);
  for (const permission of permissions) {
    const row = page.locator(`[data-permission="${permission}"]`);
    await expect(row.getByText("Granted", { exact: true })).toBeVisible();
    await expect(row.locator(".gift-box")).toHaveAttribute(
      "data-box-state",
      "open",
    );
    await expect(row.getByRole("button")).toBeDisabled();
  }
  expect(
    await page.evaluate(() => Reflect.get(window, "permissionAcquisitions")),
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("ten-permissions.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('[data-permission="clipboard-read"]').screenshot({
    path: testInfo.outputPath("clipboard-permission-mobile.png"),
  });
});

test("responds to native permission changes and revocation while showing current states separately from achieved boxes", async ({
  page,
  context,
}) => {
  await context.grantPermissions([]);
  await page.goto("/?locale=en&stage=S-650");
  for (const permission of permissions) {
    const row = page.locator(`[data-permission="${permission}"]`);
    await expect(row.getByText("Denied", { exact: true })).toBeVisible();
    await expect(row.locator(".gift-box")).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
  }
  await page
    .locator('[data-permission="clipboard-write"]')
    .getByRole("button")
    .click();
  expect(
    await page.evaluate(() => Reflect.get(window, "permissionAcquisitions")),
  ).toEqual([]);
  await grantAll(context, page);
  for (const permission of permissions)
    await expect(
      page.locator(`[data-permission="${permission}"] .gift-box`),
    ).toHaveAttribute("data-box-state", "open");
  await context.clearPermissions();
  await context.grantPermissions([]);
  await expect(
    page
      .locator('[data-permission="camera"]')
      .getByText("Denied", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-permission="camera"] .gift-box'),
  ).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(() => Reflect.get(window, "permissionAcquisitions")),
  ).toEqual([]);
});
