import { expect, test } from "@playwright/test";
import type { Hid, HidDevice, HidReport } from "../src/stages/S-290/stage";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Controlled WebHID transport fixture; no physical/native HID input is claimed.
    const reports = new Set<(event: HidReport) => void>();
    const disconnects = new Set<(event: { device: HidDevice }) => void>();
    let closed = 0;
    const device: HidDevice = {
      opened: false,
      async open() {
        this.opened = true;
      },
      async close() {
        this.opened = false;
        closed++;
      },
      addEventListener(_type, listener) {
        reports.add(listener);
      },
      removeEventListener(_type, listener) {
        reports.delete(listener);
      },
    };
    const hid: Hid = {
      async requestDevice(options) {
        Reflect.set(window, "hidRequestedFilters", options.filters);
        return [device];
      },
      addEventListener(_type, listener) {
        disconnects.add(listener);
      },
      removeEventListener(_type, listener) {
        disconnects.delete(listener);
      },
    };
    Object.defineProperty(navigator, "hid", { configurable: true, value: hid });
    Reflect.set(
      window,
      "emitHidFixture",
      (bytes: number[], isTrusted: boolean) => {
        for (const listener of reports)
          listener({
            isTrusted,
            data: new DataView(Uint8Array.from(bytes).buffer),
          });
      },
    );
    Reflect.set(window, "hidFixtureState", () => ({
      opened: device.opened,
      closed,
      reports: reports.size,
      disconnects: disconnects.size,
    }));
  });
});
test("one box uses empty filters and requires a nonempty report, not open or ordinary typing", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-290");
  const box = page.locator(".problem-gift .gift-box");
  await page.getByRole("button", { name: /^Device connection:/ }).click();
  await expect(page.getByRole("status")).toHaveText("Waiting");
  expect(
    await page.evaluate(() => Reflect.get(window, "hidRequestedFilters")),
  ).toEqual([]);
  await page.keyboard.press("A");
  await page.evaluate(() => {
    const emit = Reflect.get(window, "emitHidFixture") as (
      bytes: number[],
      trusted: boolean,
    ) => void;
    emit([], true);
    emit([0], false);
  });
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    const emit = Reflect.get(window, "emitHidFixture") as (
      bytes: number[],
      trusted: boolean,
    ) => void;
    emit([0], true);
  });
  await expect(box).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(() =>
      (Reflect.get(window, "hidFixtureState") as () => unknown)(),
    ),
  ).toEqual({ opened: false, closed: 1, reports: 0, disconnects: 0 });
  await page.screenshot({ path: testInfo.outputPath("hid-one-box.png") });
});
test("departure closes a waiting HID device and removes listeners", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-290");
  await page.getByRole("button", { name: /^Device connection:/ }).click();
  await expect(page.getByRole("status")).toHaveText("Waiting");
  await page.getByRole("button", { name: /Next stage/ }).click();
  await expect(page.locator(".stage-view h2")).not.toHaveText("Raw input");
  expect(
    await page.evaluate(() =>
      (Reflect.get(window, "hidFixtureState") as () => unknown)(),
    ),
  ).toEqual({ opened: false, closed: 1, reports: 0, disconnects: 0 });
});
