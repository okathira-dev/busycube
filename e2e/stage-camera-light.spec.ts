import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, test } from "@playwright/test";

function cameraFixture(brightFirst: boolean) {
  const path = resolve(
    "node_modules/.cache/stage-review-tmp",
    brightFirst ? "camera-bright-first.y4m" : "camera-dark-first.y4m",
  );
  mkdirSync(dirname(path), { recursive: true });
  const frames = [Buffer.from("YUV4MPEG2 W64 H48 F10:1 Ip A1:1 C420jpeg\n")];
  for (const luma of brightFirst ? [235, 16] : [16, 235])
    for (let frame = 0; frame < 30; frame++)
      frames.push(
        Buffer.from("FRAME\n"),
        Buffer.alloc(64 * 48, luma),
        Buffer.alloc((64 * 48) / 2, 128),
      );
  writeFileSync(path, Buffer.concat(frames));
  return path;
}
for (const brightFirst of [false, true]) {
  test(`uses actual ${brightFirst ? "bright-first" : "dark-first"} camera frames and restores the stage on departure`, async ({
    playwright,
    baseURL,
  }, testInfo) => {
    const browser = await playwright.chromium.launch({
      headless: true,
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-video-capture=${cameraFixture(brightFirst)}`,
      ],
    });
    try {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await page.addInitScript(() => {
        const original = MediaDevices.prototype.getUserMedia;
        MediaDevices.prototype.getUserMedia = async function (
          this: MediaDevices,
          constraints,
        ) {
          const stream = await original.call(this, constraints);
          Reflect.set(window, "capturedStageTracks", stream.getTracks());
          return stream;
        };
      });
      await page.goto("/?locale=en&stage=S-110");
      const boxes = page.locator(".s110-boxes .gift-box");
      await expect(page.getByText("Camera", { exact: true })).toBeVisible();
      await expect(
        page.locator('.s110-boxes .gift-box[data-box-state="open"]'),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: brightFirst ? /^Sun:/ : /^Moon:/ })
        .click();
      await expect(boxes.nth(brightFirst ? 1 : 0)).toHaveAttribute(
        "data-box-state",
        "open",
        { timeout: 10_000 },
      );
      await expect(boxes.nth(brightFirst ? 0 : 1)).not.toHaveAttribute(
        "data-box-state",
        "open",
      );
      await page.screenshot({
        path: testInfo.outputPath("first-camera-level.png"),
        fullPage: true,
      });
      await expect(
        page.locator('.s110-boxes .gift-box[data-box-state="open"]'),
      ).toHaveCount(2, { timeout: 10_000 });
      const background = await page
        .locator(".stage-view")
        .evaluate((node) => getComputedStyle(node).backgroundColor);
      expect(background).toBe(
        brightFirst ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)",
      );
      await expect(
        page.locator(".s110-boxes .problem-gift__clue").first(),
      ).toHaveCSS("color", "rgb(255, 255, 255)");
      await page.getByRole("button", { name: /Next stage/ }).click();
      await expect(page.locator(".s110-stage")).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          (
            Reflect.get(window, "capturedStageTracks") as MediaStreamTrack[]
          ).every((track) => track.readyState === "ended"),
        ),
      ).toBe(true);
      expect(
        await page
          .locator(".stage-view")
          .evaluate((node) => node.classList.contains("s110-camera-host")),
      ).toBe(false);
    } finally {
      await browser.close();
    }
  });
}
