import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function waveform(notes: number[]) {
  const rate = 48000,
    seconds = 1 + notes.length * 1.5,
    bytes = Buffer.alloc(44 + seconds * rate * 2);
  bytes.write("RIFF");
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
  bytes.writeUInt32LE(bytes.length - 44, 40);
  for (let i = rate; i < seconds * rate; i++) {
    const section = Math.floor((i / rate - 1) / 1.5),
      within = (i / rate - 1) % 1.5;
    const frequency = notes[section] ?? 440,
      amplitude = within < 1.2 ? 0.3 : 0;
    bytes.writeInt16LE(
      Math.round(
        32767 * amplitude * Math.sin((2 * Math.PI * frequency * i) / rate),
      ),
      44 + i * 2,
    );
  }
  const path = resolve(
    "node_modules/.cache/stage-review-tmp",
    notes.length > 1 ? "guitar-six-notes.wav" : "guitar-outside-note.wav",
  );
  writeFileSync(path, bytes);
  return path;
}
test("real microphone capture and Web Audio recognize six single notes, distinguish E octaves, and stop after all six", async ({
  playwright,
  baseURL,
}, info) => {
  const browser = await playwright.chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-audio-capture=${waveform([82.4069, 110, 146.8324, 195.9977, 246.9417, 329.6276])}`,
    ],
  });
  try {
    const context = await browser.newContext({ baseURL }),
      page = await context.newPage();
    await page.addInitScript(() => {
      const native = MediaDevices.prototype.getUserMedia;
      Reflect.set(window, "guitarTracks", []);
      MediaDevices.prototype.getUserMedia = async function (constraints) {
        const stream = await native.call(this, constraints);
        Reflect.get(window, "guitarTracks").push(...stream.getTracks());
        return stream;
      };
    });
    await page.goto("/?locale=en&stage=S-950");
    const gifts = page.locator(".s950-stage .gift-box");
    await expect(gifts).toHaveCount(6);
    expect(
      await page.evaluate(() => Reflect.get(window, "guitarTracks").length),
    ).toBe(0);
    await gifts.nth(5).click();
    await expect(page.getByRole("status")).toHaveText("Active");
    await expect
      .poll(
        () =>
          gifts.evaluateAll(
            (boxes) =>
              boxes.filter(
                (box) => box.getAttribute("data-box-state") === "open",
              ).length,
          ),
        { timeout: 16000 },
      )
      .toBe(6);
    await expect(page.getByRole("status")).toHaveText("Success");
    expect(
      await page.evaluate(() =>
        Reflect.get(window, "guitarTracks").every(
          (track: MediaStreamTrack) => track.readyState === "ended",
        ),
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("guitar-pc.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: info.outputPath("guitar-mobile.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await expect
      .poll(() =>
        gifts.evaluateAll((boxes) =>
          boxes.every((box) => box.getAttribute("data-box-state") === "closed"),
        ),
      )
      .toBe(true);
  } finally {
    await browser.close();
  }
});
test("refusal stays uncompleted; late native microphone permission is stopped on cancel and departure releases the next capture", async ({
  playwright,
  baseURL,
}) => {
  const browser = await playwright.chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-audio-capture=${waveform([440])}`,
    ],
  });
  try {
    const context = await browser.newContext({ baseURL }),
      page = await context.newPage();
    await page.addInitScript(() => {
      const native = MediaDevices.prototype.getUserMedia,
        f = { calls: 0, tracks: [] as MediaStreamTrack[], release: () => {} };
      Reflect.set(window, "guitarFixture", f);
      MediaDevices.prototype.getUserMedia = async function (constraints) {
        const count = ++f.calls;
        if (count === 1) throw new DOMException("Denied", "NotAllowedError");
        const stream = await native.call(this, constraints);
        f.tracks.push(...stream.getTracks());
        if (count === 2)
          await new Promise<void>((resolve) => {
            f.release = resolve;
          });
        return stream;
      };
    });
    await page.goto("/?locale=en&stage=S-950");
    const gift = page.locator(".s950-stage .gift-box").first();
    await gift.click();
    await expect(page.getByRole("status")).toHaveText("Denied");
    await expect(gift).toHaveAttribute("data-box-state", "ribboned");
    await gift.click();
    await expect
      .poll(() =>
        page.evaluate(() => Reflect.get(window, "guitarFixture").tracks.length),
      )
      .toBe(1);
    await page
      .getByRole("button", { name: "Stop microphone", exact: true })
      .click();
    await page.evaluate(() => Reflect.get(window, "guitarFixture").release());
    await expect
      .poll(() =>
        page.evaluate(
          () => Reflect.get(window, "guitarFixture").tracks[0].readyState,
        ),
      )
      .toBe("ended");
    await gift.click();
    await expect(page.getByRole("status")).toHaveText("Active");
    await page
      .getByRole("button", { name: "Back to boxes", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            Reflect.get(window, "guitarFixture").tracks.length === 2 &&
            Reflect.get(window, "guitarFixture").tracks.every(
              (track: MediaStreamTrack) => track.readyState === "ended",
            ),
        ),
      )
      .toBe(true);
    await page.goto("/?locale=en&stage=S-950");
    await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  } finally {
    await browser.close();
  }
});
