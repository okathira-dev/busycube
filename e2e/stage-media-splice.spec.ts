import { expect, test } from "@playwright/test";

test("four anonymous previews splice in any selected order; only the continuous native video reaching its end clears", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const f = {
      appends: [] as number[],
      urls: [] as string[],
      revoked: [] as string[],
    };
    Reflect.set(window, "spliceFixture", f);
    const append = SourceBuffer.prototype.appendBuffer;
    SourceBuffer.prototype.appendBuffer = function (bytes) {
      f.appends.push(this.timestampOffset);
      return append.call(this, bytes);
    };
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (value) => {
      const url = create(value);
      if (value instanceof MediaSource) f.urls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      f.revoked.push(url);
      revoke(url);
    };
  });
  await page.goto("/?locale=en&stage=S-900");
  const gift = page.locator(".s900-stage .gift-box"),
    result = page.locator(".s900-video");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  const cards = page.locator(".s900-reel");
  await expect(cards).toHaveCount(4);
  const filenames = await cards
    .locator("video")
    .evaluateAll((videos) =>
      videos.map(
        (video) => (video as HTMLVideoElement).src.match(/\/([a-d])-/)?.[1],
      ),
    );
  expect(filenames).not.toEqual(["a", "b", "c", "d"]);
  expect(await page.locator(".s900-stage").innerText()).not.toMatch(
    /\b(?:A|B|C|D|wrong|numbered)\b/i,
  );
  for (const video of await cards.locator("video").all()) {
    await video.evaluate(async (element: HTMLVideoElement) => {
      await element.play();
      element.pause();
    });
    expect(
      await video.evaluate((element: HTMLVideoElement) => element.videoWidth),
    ).toBe(640);
  }
  const add = async (letters: string[]) => {
    for (const letter of letters)
      await cards
        .filter({ has: page.locator(`video[src*="/${letter}-"]`) })
        .getByRole("button")
        .click();
  };
  const finish = async () => {
    await expect(page.getByRole("status")).toHaveText("Created");
    await result.evaluate(async (video: HTMLVideoElement) => {
      video.currentTime = video.duration - 0.3;
      await video.play();
    });
    await expect
      .poll(() => result.evaluate((video: HTMLVideoElement) => video.ended))
      .toBe(true);
  };
  await add(["b", "a", "d", "c"]);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await finish();
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  expect(
    await page.evaluate(() => Reflect.get(window, "spliceFixture").appends),
  ).toEqual([0, 8 / 15, 38 / 15, 68 / 15, 98 / 15]);
  await page.getByRole("button", { name: "Clear order", exact: true }).click();
  await expect(result).toHaveCount(0);
  await add(["a", "b", "c", "d"]);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Created");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await result.evaluate((video) => video.dispatchEvent(new Event("ended")));
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await result.evaluate((video: HTMLVideoElement) => {
    video.pause();
    video.currentTime = 5.4;
  });
  await expect
    .poll(() =>
      result.evaluate(
        (video: HTMLVideoElement) => !video.seeking && video.readyState >= 2,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: info.outputPath("splices-pc.png") });
  await finish();
  await expect(gift).toHaveAttribute("data-box-state", "open");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("splices-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const f = Reflect.get(window, "spliceFixture");
        return (
          f.urls.length === 2 &&
          f.urls.every((url: string) => f.revoked.includes(url))
        );
      }),
    )
    .toBe(true);
  await page.goto("/?locale=en&stage=S-900");
  await expect(gift).toHaveAttribute("data-box-state", "closed");
});

test("unavailable reel and reset during a held fetch stay uncompleted and release the actual request", async ({
  page,
}) => {
  let held = false;
  await page.route(/\/assets\/[a-d]-.*\.webm$/, async (route) => {
    if (!held) return route.fulfill({ status: 503 });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });
    await route.abort();
  });
  await page.addInitScript(() => {
    const original = fetch;
    Reflect.set(window, "spliceSignals", []);
    window.fetch = async (resource, options) => {
      if (options?.signal)
        Reflect.get(window, "spliceSignals").push(options.signal);
      return original(resource, options);
    };
  });
  await page.goto("/?locale=en&stage=S-900");
  const buttons = page.locator(".s900-reel button"),
    gift = page.locator(".s900-stage .gift-box");
  await expect(buttons).toHaveCount(4);
  for (const button of await buttons.all()) await button.click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Unavailable");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  held = true;
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Waiting");
  await page.getByRole("button", { name: "Clear order", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Idle");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, "spliceSignals").length > 5 &&
          Reflect.get(window, "spliceSignals").every(
            (signal: AbortSignal) => signal.aborted,
          ),
      ),
    )
    .toBe(true);
  await expect(page.locator(".s900-video")).toHaveCount(0);
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
});
