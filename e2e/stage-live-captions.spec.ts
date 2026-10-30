import { expect, test } from "@playwright/test";

test("rejects accumulated wrong captions and accepts all correct paused captions after reset", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-910");
  const video = page.locator(".s910-video");
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate(async (node) => {
    const media = node as HTMLVideoElement;
    await media.play();
    media.pause();
  });
  await expect
    .poll(() =>
      video.evaluate((node) => {
        const media = node as HTMLVideoElement;
        return media.seekable.length
          ? media.seekable.end(media.seekable.length - 1)
          : 0;
      }),
    )
    .toBeGreaterThan(3.5);
  const seek = async (time: number) => {
    await video.evaluate((node, at) => {
      const media = node as HTMLVideoElement;
      media.pause();
      media.currentTime = at;
    }, time);
    await expect
      .poll(() =>
        video.evaluate((node) => (node as HTMLVideoElement).currentTime),
      )
      .toBeCloseTo(time, 2);
    await expect
      .poll(() => video.evaluate((node) => (node as HTMLVideoElement).seeking))
      .toBe(false);
  };
  const open = page.locator('.stage-view .gift-box[data-box-state="open"]');
  await seek(0.8);
  for (const name of ["Circle", "Triangle", "Square"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reset", exact: true }),
  ).toHaveAttribute("data-invalid", "true");
  for (const [time, name] of [
    [0.9, "Circle"],
    [1.9, "Triangle"],
    [3.1, "Square"],
  ] as const) {
    await seek(time);
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("data-matched", "true");
  }
  await expect(open).toHaveCount(0);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const cues = () =>
    video.evaluate((node) =>
      Array.from((node as HTMLVideoElement).textTracks)
        .filter((track) => track.mode === "showing")
        .flatMap((track) =>
          Array.from(track.cues ?? []).map((cue) => ({
            id: cue.id,
            start: cue.startTime,
            end: cue.endTime,
            text: (cue as VTTCue).text,
          })),
        ),
    );
  await expect.poll(async () => (await cues()).length).toBe(0);
  for (const [time, name] of [
    [1.25, "Circle"],
    [2.3, "Triangle"],
    [3.45, "Square"],
  ] as const) {
    await seek(time);
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("data-matched", "true");
  }
  await expect(open).toHaveCount(1);
  const actual = await cues();
  expect(actual.map((cue) => cue.text)).toEqual(["○", "△", "□"]);
  expect(actual.map((cue) => cue.end)).toEqual([1.267, 2.4, 3.533]);
  expect(
    await video.evaluate((node) => (node as HTMLVideoElement).paused),
  ).toBe(true);
});
