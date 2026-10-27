import { expect, test } from "@playwright/test";

for (const outsideFirst of [false, true]) {
  test(`recognizes real tab pixels in ${outsideFirst ? "outside-first" : "inside-first"} order`, async ({
    playwright,
    baseURL,
  }, testInfo) => {
    const browser = await playwright.chromium.launch({
      headless: true,
      channel: "chromium",
      args: [
        "--auto-select-tab-capture-source-by-title=S190 capture source",
        "--enable-usermedia-screen-capturing",
      ],
    });
    try {
      const context = await browser.newContext({
        baseURL,
        viewport: { width: 1280, height: 960 },
      });
      const source = await context.newPage();
      await source.goto(
        outsideFirst ? "/?locale=en" : "/?locale=en&stage=S-190",
      );
      await expect(
        source.locator(
          outsideFirst ? ".stage-catalogue__marker" : ".s190-explore",
        ),
      ).toBeAttached();
      await source.evaluate(() => {
        document.title = "S190 capture source";
      });
      const page = await context.newPage();
      await page.goto("/?locale=en&stage=S-190");
      await page
        .getByRole("button", { name: "Share a screen", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: /^Active$/ }),
      ).toBeVisible({ timeout: 15000 });
      const boxes = page.locator(".s190-boxes .gift-box");
      await expect(
        page.locator('.s190-boxes .gift-box[data-box-state="open"]'),
      ).toHaveCount(0);
      await source
        .locator(outsideFirst ? ".stage-catalogue__marker" : ".s190-marker")
        .scrollIntoViewIfNeeded();
      await page.bringToFront();
      await expect(boxes.nth(outsideFirst ? 1 : 0)).toHaveAttribute(
        "data-box-state",
        "open",
        {
          timeout: 15000,
        },
      );
      await expect(boxes.nth(outsideFirst ? 0 : 1)).not.toHaveAttribute(
        "data-box-state",
        "open",
      );
      await source.goto(
        outsideFirst ? "/?locale=en&stage=S-190" : "/?locale=en",
      );
      await source
        .locator(outsideFirst ? ".s190-marker" : ".stage-catalogue__marker")
        .scrollIntoViewIfNeeded();
      await page.bringToFront();
      await expect(boxes.nth(outsideFirst ? 0 : 1)).toHaveAttribute(
        "data-box-state",
        "open",
        {
          timeout: 15000,
        },
      );
      await page.screenshot({
        path: testInfo.outputPath("screen-markers.png"),
      });
      const tracks = await page
        .locator("video.s190-preview")
        .evaluate((video) => {
          if (
            !(video instanceof HTMLVideoElement) ||
            !(video.srcObject instanceof MediaStream)
          )
            throw new Error("No actual stream");
          const tracks = video.srcObject.getVideoTracks();
          Reflect.set(window, "observedCaptureTracks", tracks);
          return tracks.map((t) => ({
            surface: t.getSettings().displaySurface,
            state: t.readyState,
          }));
        });
      expect(tracks).toEqual([{ surface: "browser", state: "live" }]);
      await page.getByRole("button", { name: /Next stage/ }).click();
      await expect(page.locator(".s190-preview")).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          (
            Reflect.get(window, "observedCaptureTracks") as MediaStreamTrack[]
          ).every((track) => track.readyState === "ended"),
        ),
      ).toBe(true);
      await context.close();
    } finally {
      await browser.close();
    }
  });
}
