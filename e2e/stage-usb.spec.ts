import { expect, test } from "@playwright/test";
import type { Usb, UsbDevice } from "../src/stages/S-300/stage";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Controlled WebUSB fixture; no physical/native USB open is claimed.
    let closed = 0;
    let transfers = 0;
    const device: UsbDevice = {
      opened: false,
      async open() {
        await new Promise<void>((resolve) => {
          Reflect.set(window, "completeUsbFixtureOpen", () => {
            device.opened = true;
            resolve();
          });
        });
      },
      async close() {
        this.opened = false;
        closed++;
      },
    };
    const forbidden = () => {
      transfers++;
      throw new Error("Forbidden transfer or configuration");
    };
    Object.assign(device, {
      selectConfiguration: forbidden,
      claimInterface: forbidden,
      transferIn: forbidden,
      transferOut: forbidden,
    });
    Object.defineProperty(device, "configuration", { get: forbidden });
    const usb: Usb = {
      async requestDevice(options) {
        Reflect.set(window, "usbFixtureFilters", options.filters);
        return device;
      },
    };
    Object.defineProperty(navigator, "usb", { configurable: true, value: usb });
    Reflect.set(window, "usbFixtureState", () => ({
      opened: device.opened,
      closed,
      transfers,
    }));
  });
});
test("device selection alone does not solve; open succeeds and closes without transferring", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-300");
  const box = page.locator(".problem-gift .gift-box");
  await page.getByRole("button", { name: /^USB:/ }).click();
  await expect(page.getByRole("status")).toHaveText("Waiting");
  expect(
    await page.evaluate(() => Reflect.get(window, "usbFixtureFilters")),
  ).toEqual([]);
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.evaluate(() =>
    (Reflect.get(window, "completeUsbFixtureOpen") as () => void)(),
  );
  await expect(box).toHaveAttribute("data-box-state", "open");
  await expect(page.getByRole("status")).toHaveText("Opened");
  expect(
    await page.evaluate(() =>
      (Reflect.get(window, "usbFixtureState") as () => unknown)(),
    ),
  ).toEqual({ opened: false, closed: 1, transfers: 0 });
  await page.screenshot({ path: testInfo.outputPath("usb-open-only.png") });
});
test("a late open is closed after leaving and cannot solve the departed stage", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-300");
  await page.getByRole("button", { name: /^USB:/ }).click();
  await expect(page.getByRole("status")).toHaveText("Waiting");
  await page.getByRole("button", { name: /Next stage/ }).click();
  await expect(page).not.toHaveURL(/stage=S-300/);
  await page.evaluate(() =>
    (Reflect.get(window, "completeUsbFixtureOpen") as () => void)(),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        (Reflect.get(window, "usbFixtureState") as () => unknown)(),
      ),
    )
    .toEqual({ opened: false, closed: 1, transfers: 0 });
});
