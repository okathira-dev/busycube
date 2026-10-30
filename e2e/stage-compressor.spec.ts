import { readFile } from "node:fs/promises";
import { expect, type Locator, test } from "@playwright/test";
import jsQR from "jsqr";
import { BlobSource, Input, WEBM } from "mediabunny";

async function seek(video: Locator, time: number) {
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate(async (v: HTMLVideoElement, target) => {
    if (Math.abs(v.currentTime - target) > 0.01)
      await new Promise<void>((resolve) => {
        v.addEventListener("seeked", () => resolve(), { once: true });
        v.currentTime = target;
      });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, time);
}
async function frame(video: Locator) {
  return video.evaluate((v: HTMLVideoElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No frame context");
    context.drawImage(v, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      data: Array.from(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
    };
  });
}
test("the supplied samples really transform through all four existing gimmicks; flags remain password inputs", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await page.goto("/?locale=en&stage=S-710");
  const tool = page.frameLocator(".s710-tool-frame");
  const output = tool.locator(".pane").last().locator("video");
  const input = tool.locator(".pane").first().locator("video");
  const gifts = page.locator(".s710-stage .gift-box");
  const compress = async () => {
    await tool.getByRole("button", { name: "COMPRESS →", exact: true }).click();
    await expect(tool.getByRole("status")).toContainText(
      "Done — output size ratio",
      { timeout: 30_000 },
    );
  };
  await tool.getByRole("button", { name: "A", exact: true }).click();
  await expect(tool.getByRole("status")).toHaveText("Input ready.");
  await seek(input, 4.5);
  const before = await frame(input);
  expect(before.data.filter((n, i) => i % 4 !== 3 && n > 16).length).toBe(0);
  await compress();
  await seek(output, 4.5);
  const after = await frame(output);
  expect(
    after.data.filter((n, i) => i % 4 !== 3 && n > 220).length,
  ).toBeGreaterThan(1000);
  await output.screenshot({ path: info.outputPath("dark-frame.png") });
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
  const answer = page.getByRole("textbox", { name: "Password", exact: true });
  await answer.fill("busycube{dark_frame}");
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "open");
  const downloading = page.waitForEvent("download");
  await tool.getByRole("link", { name: "Download WebM", exact: true }).click();
  const download = await downloading;
  const outputPath = info.outputPath("first-output.webm");
  await download.saveAs(outputPath);
  const bytes = await readFile(outputPath);
  const metadata = new Input({
    source: new BlobSource(new Blob([new Uint8Array(bytes)])),
    formats: [WEBM],
  });
  expect((await metadata.getMetadataTags()).raw?.BUSYCUBE_TRANSFORMER).toBe(
    "S710_V1",
  );
  metadata.dispose();
  await tool
    .getByRole("button", { name: "Use output as input", exact: true })
    .click();
  await expect(tool.getByRole("status")).toHaveText("Input ready.");
  await compress();
  await seek(output, 1);
  await output.screenshot({ path: info.outputPath("second-pass.png") });
  await answer.fill("busycube{second_pass}");
  await expect(gifts.nth(3)).toHaveAttribute("data-box-state", "open");
  await tool.getByRole("button", { name: "B", exact: true }).click();
  await expect(tool.getByRole("status")).toHaveText("Input ready.");
  await compress();
  await seek(output, 4.5);
  const qr = await frame(output);
  expect(jsQR(new Uint8ClampedArray(qr.data), qr.width, qr.height)?.data).toBe(
    "busycube{qr_replaced}",
  );
  await answer.fill("busycube{qr_replaced}");
  await expect(gifts.nth(2)).toHaveAttribute("data-box-state", "open");
  await tool.getByRole("button", { name: "C", exact: true }).click();
  await expect(tool.getByRole("status")).toHaveText("Input ready.");
  await tool.getByRole("button", { name: "COMPRESS →", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText(
    "A recovery clip was returned.",
  );
  await seek(output, 0.3);
  await output.screenshot({ path: info.outputPath("broken-input.png") });
  await answer.fill("busycube{broken_input}");
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "open");
  await page.screenshot({
    path: info.outputPath("compressor-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("compressor-mobile.png"),
    fullPage: true,
  });
});

test("camera recording starts only from its control and native tracks end when the tool leaves", async ({
  playwright,
  baseURL,
}) => {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const native = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async (options) => {
        const stream = await native(options);
        Reflect.set(
          window.top ?? window,
          "compressorTracks",
          stream.getTracks(),
        );
        return stream;
      };
    });
    await page.goto("/?locale=en&stage=S-710");
    const tool = page.frameLocator(".s710-tool-frame");
    await expect(
      tool.getByRole("button", { name: "Record 10s", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => Reflect.get(window, "compressorTracks")),
    ).toBeUndefined();
    await tool.getByRole("button", { name: "Record 10s", exact: true }).click();
    await expect(
      tool.getByRole("button", { name: "Stop", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        Reflect.get(window, "compressorTracks").every(
          (track: MediaStreamTrack) => track.readyState === "live",
        ),
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Back to boxes", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Reflect.get(window, "compressorTracks").every(
            (track: MediaStreamTrack) => track.readyState === "ended",
          ),
        ),
      )
      .toBe(true);
  } finally {
    await browser.close();
  }
});
