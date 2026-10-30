import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, test } from "@playwright/test";

function microphoneFixture(loudFirst: boolean) {
  const path = resolve(
    "node_modules/.cache/stage-review-tmp",
    loudFirst ? "microphone-noise-first.wav" : "microphone-quiet-first.wav",
  );
  mkdirSync(dirname(path), { recursive: true });
  const rate = 48000;
  const sections = loudFirst
    ? [
        [4, 0.45],
        [1.5, 0.001],
        [4, 0.45],
      ]
    : [
        [1.5, 0.001],
        [4, 0.45],
      ];
  const count = sections.reduce(
    (sum, section) => sum + (section[0] ?? 0) * rate,
    0,
  );
  const bytes = Buffer.alloc(44 + count * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(count * 2, 40);
  let sample = 0;
  for (const [duration = 0, amplitude = 0] of sections)
    for (let i = 0; i < duration * rate; i++, sample++)
      bytes.writeInt16LE(
        Math.round(
          32767 * amplitude * Math.sin((2 * Math.PI * 440 * sample) / rate),
        ),
        44 + sample * 2,
      );
  writeFileSync(path, bytes);
  return path;
}
for (const loudFirst of [false, true]) {
  test(`uses actual ${loudFirst ? "noise-first" : "quiet-first"} microphone RMS without a final quiet step`, async ({
    playwright,
    baseURL,
  }, testInfo) => {
    const browser = await playwright.chromium.launch({
      headless: true,
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${microphoneFixture(loudFirst)}`,
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
          const settings = stream.getAudioTracks()[0]?.getSettings();
          const supported = navigator.mediaDevices.getSupportedConstraints();
          Reflect.set(window, "stageMicrophoneTracks", stream.getTracks());
          Reflect.set(window, "stageMicrophoneObservation", {
            requested: constraints?.audio,
            actual: {
              autoGainControl: settings?.autoGainControl,
              noiseSuppression: settings?.noiseSuppression,
              echoCancellation: settings?.echoCancellation,
            },
            supported: {
              autoGainControl: supported.autoGainControl,
              noiseSuppression: supported.noiseSuppression,
              echoCancellation: supported.echoCancellation,
            },
          });
          return stream;
        };
      });
      await page.goto("/?locale=en&stage=S-120");
      await expect(page.getByText("Microphone", { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: /Speaker with sound waves:/ })
        .click();
      const status = page.locator(".s120-stage [role=status]");
      await expect(status).toHaveText("Active");
      const box = page.locator(".s120-stage .gift-box");
      if (loudFirst) {
        await expect
          .poll(() =>
            page
              .locator(".sound-ring")
              .evaluate(
                (node) =>
                  new DOMMatrixReadOnly(getComputedStyle(node).transform).a,
              ),
          )
          .toBeGreaterThan(1.6);
        await page.waitForTimeout(1500);
        await expect(box).not.toHaveAttribute("data-box-state", "open");
      }
      await expect(box).toHaveAttribute("data-box-state", "open", {
        timeout: 10000,
      });
      await expect(status).toHaveText("Success");
      const observation = await page.evaluate(() =>
        Reflect.get(window, "stageMicrophoneObservation"),
      );
      expect(observation.requested).toMatchObject({
        autoGainControl: { ideal: false },
        noiseSuppression: { ideal: false },
        echoCancellation: { ideal: false },
      });
      expect(observation.actual).toEqual({
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false,
      });
      await testInfo.attach("reported-input-processing", {
        body: JSON.stringify(observation),
        contentType: "application/json",
      });
      expect(
        await page.evaluate(() =>
          (
            Reflect.get(window, "stageMicrophoneTracks") as MediaStreamTrack[]
          ).every((track) => track.readyState === "ended"),
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("rms-solved.png"),
        fullPage: true,
      });
    } finally {
      await browser.close();
    }
  });
}
