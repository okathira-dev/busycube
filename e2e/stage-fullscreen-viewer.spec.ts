import { expect, test } from "@playwright/test";

test("static viewer becomes a live box only inside its real fullscreen element and returns to a still image", async ({
  page,
}, info) => {
  await page.goto("/?locale=en&stage=S-890");
  const frame = page.locator(".s890-frame"),
    gift = frame.locator(".gift-box");
  await expect(frame).toHaveAttribute("data-fullscreen", "false");
  expect(await frame.getByRole("button").count()).toBe(1);
  await gift.click();
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await page.screenshot({ path: info.outputPath("viewer-pc.png") });
  await frame.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect(frame).toHaveAttribute("data-fullscreen", "true");
  expect(
    await frame.evaluate((element) => document.fullscreenElement === element),
  ).toBe(true);
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  expect(
    await frame
      .locator(".s890-live")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("s890-drift");
  await gift.getByRole("button").hover({ force: true });
  await page.screenshot({ path: info.outputPath("viewer-fullscreen.png") });
  await gift.getByRole("button").click();
  await expect(gift).toHaveAttribute("data-box-state", "open");
  await frame
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();
  await expect(frame).toHaveAttribute("data-fullscreen", "false");
  expect(
    await frame
      .locator(".s890-live")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(await gift.getByRole("button").count()).toBe(0);
  await page.reload();
  await expect(gift).toHaveAttribute("data-box-state", "closed");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("viewer-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("request failure stays uncompleted and a delayed native fullscreen completion is cleaned up after departure", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-890");
  const frame = page.locator(".s890-frame");
  await expect(frame).toHaveAttribute("data-fullscreen", "false");
  await frame.evaluate((element) => {
    const original = element.requestFullscreen.bind(element);
    const f = { calls: 0, entered: false, release: () => {} };
    Reflect.set(window, "fullscreenFixture", f);
    const gate = new Promise<void>((resolve) => {
      f.release = resolve;
    });
    element.requestFullscreen = async () => {
      if (++f.calls === 1) throw new DOMException("Denied", "NotAllowedError");
      await original();
      f.entered = true;
      await gate;
    };
  });
  await frame.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Unavailable");
  await expect(frame.locator(".gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await frame.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fullscreenFixture").entered),
    )
    .toBe(true);
  // The normal back button is outside the fullscreen top layer. Trigger only
  // navigation through its existing click handler to exercise SPA teardown.
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(frame).toHaveCount(0);
  await page.evaluate(() => Reflect.get(window, "fullscreenFixture").release());
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await page.goto("/?locale=en&stage=S-890");
  await expect(frame.locator(".gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
});
