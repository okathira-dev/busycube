import { expect, type Page, test } from "@playwright/test";

// Capture successfully registered native handlers; this is a controlled external
// callback fixture, not an OS media-key or browser-toolbar interaction.
async function observe(page: Page) {
  await page.addInitScript(() => {
    const events: unknown[] = [];
    Reflect.set(window, "mediaEvents", events);
    for (const name of ["seeked", "loadeddata", "playing", "error"]) {
      document.addEventListener(
        name,
        (event) => {
          if (event.target instanceof HTMLVideoElement) {
            const v = event.target;
            events.push({
              type: event.type,
              trusted: event.isTrusted,
              time: v.currentTime,
              ready: v.readyState,
              src: v.currentSrc,
              error: v.error?.message,
            });
          }
        },
        true,
      );
    }
    const handlers = new Map<string, MediaSessionActionHandler>();
    Reflect.set(window, "mediaFixture", handlers);
    const native = navigator.mediaSession.setActionHandler.bind(
      navigator.mediaSession,
    );
    navigator.mediaSession.setActionHandler = (action, callback) => {
      native(action, callback);
      if (callback) handlers.set(action, callback);
      else handlers.delete(action);
    };
  });
}
async function invoke(
  page: Page,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const cdp = await page.context().newCDPSession(page);
  const result = await cdp.send("Runtime.evaluate", {
    expression: `window.mediaFixture.get(${JSON.stringify(action)})(${JSON.stringify({ action, ...extra })})`,
    userGesture: true,
    awaitPromise: true,
  });
  await cdp.detach();
  expect(result.exceptionDetails).toBeUndefined();
}
const box = (page: Page, index: number) =>
  page.locator(".s430-actions .gift-box").nth(index);
const video = (page: Page) => page.locator(".s430-player video");

test("actual media changes are required for captured external actions, with two real sources and retained progress", async ({
  page,
}, info) => {
  await observe(page);
  await page.goto("/?locale=en&stage=S-430");
  await expect(page.locator(".problem-gift")).toHaveCount(10);
  await expect
    .poll(() => video(page).evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: /^Two vertical bars:/ }).click();
  await expect
    .poll(() =>
      video(page).evaluate(
        (v: HTMLVideoElement) => !v.paused && v.currentTime > 0,
      ),
    )
    .toBe(true);
  await expect(box(page, 0)).toHaveAttribute("data-box-state", "ribboned");
  expect(
    await page.evaluate(() => navigator.mediaSession.metadata?.title),
  ).toContain("A");
  await invoke(page, "pause");
  await expect(box(page, 0)).toHaveAttribute("data-box-state", "open");
  expect(await video(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(
    true,
  );
  await invoke(page, "play");
  await expect(box(page, 1)).toHaveAttribute("data-box-state", "open");
  await invoke(page, "seekto", { seekTime: 15 });
  const range = await video(page).evaluate(async (v: HTMLVideoElement) => {
    const response = await fetch(v.currentSrc, {
      headers: { Range: "bytes=100-200" },
    });
    return {
      status: response.status,
      accepts: response.headers.get("accept-ranges"),
      size: (await response.arrayBuffer()).byteLength,
    };
  });
  expect(range).toEqual({ status: 206, accepts: "bytes", size: 101 });
  await expect(
    box(page, 7),
    JSON.stringify(
      await page.evaluate(() => Reflect.get(window, "mediaEvents")),
    ),
  ).toHaveAttribute("data-box-state", "open");
  await invoke(page, "seekforward", { seekOffset: 7 });
  await expect(box(page, 3)).toHaveAttribute("data-box-state", "open");
  expect(
    await video(page).evaluate((v: HTMLVideoElement) => v.currentTime),
  ).toBeGreaterThanOrEqual(22);
  await invoke(page, "seekbackward", { seekOffset: 9 });
  await expect(box(page, 4)).toHaveAttribute("data-box-state", "open");
  const first = await video(page).evaluate(
    (v: HTMLVideoElement) => v.currentSrc,
  );
  await invoke(page, "nexttrack");
  await expect(box(page, 6)).toHaveAttribute("data-box-state", "open");
  expect(
    await video(page).evaluate((v: HTMLVideoElement) => v.currentSrc),
  ).not.toBe(first);
  expect(
    await page.evaluate(() => navigator.mediaSession.metadata?.title),
  ).toContain("B");
  await invoke(page, "previoustrack");
  await expect(box(page, 5)).toHaveAttribute("data-box-state", "open");
  expect(
    await video(page).evaluate((v: HTMLVideoElement) => v.currentSrc),
  ).toBe(first);
  await invoke(page, "seekto", { seekTime: 10 });
  await expect
    .poll(() => video(page).evaluate((v: HTMLVideoElement) => v.seeking))
    .toBe(false);
  await invoke(page, "stop");
  await expect(box(page, 2)).toHaveAttribute("data-box-state", "open");
  expect(
    await video(page).evaluate(
      (v: HTMLVideoElement) => v.paused && v.currentTime === 0,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => navigator.mediaSession.playbackState)).toBe(
    "none",
  );
  await page.screenshot({
    path: info.outputPath("media-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("media-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(box(page, 0)).toHaveAttribute("data-box-state", "closed");
  await expect(page.locator(".s430-recovery .gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
});

test("real PiP entry needs the captured Media Session request with manual reason and is released on departure", async ({
  page,
}) => {
  await observe(page);
  await page.goto("/?locale=en&stage=S-430");
  await expect
    .poll(() => video(page).evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: /^Two vertical bars:/ }).click();
  await invoke(page, "enterpictureinpicture", {
    enterPictureInPictureReason: "contentoccluded",
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(document.pictureInPictureElement)))
    .toBe(true);
  await expect(box(page, 8)).toHaveAttribute("data-box-state", "ribboned");
  await page.evaluate(() => document.exitPictureInPicture());
  await invoke(page, "enterpictureinpicture", {
    enterPictureInPictureReason: "useraction",
  });
  await expect(box(page, 8)).toHaveAttribute("data-box-state", "open");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.pictureInPictureElement)))
    .toBe(false);
  await expect(box(page, 2)).toHaveAttribute("data-box-state", "ribboned");
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.metadata))
    .toBeNull();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "mediaFixture").size))
    .toBe(0);
});
