import { expect, test } from "@playwright/test";

test("separates game-stage revisits, real reloads, and backward/forward arrivals", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-060");
  const opened = () =>
    page.locator('.stage-view .gift-box[data-box-state="open"]');
  await expect(page.locator(".beacon-path")).toBeVisible();
  await expect(opened()).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".beacon-path")).toBeVisible();
  await expect(opened()).toHaveCount(0);
  await page.locator(".stage-view__navigation-button--next button").click();
  await expect(page).toHaveURL(/stage=S-070/);
  await page.goBack();
  await expect(page.locator(".beacon-path")).toBeVisible();
  await expect(opened()).toHaveCount(1);

  await page.goto("/?locale=en&stage=S-220");
  await expect(page.locator(".problem-gift")).toHaveCount(3);
  await expect(opened()).toHaveCount(0);
  await page.reload();
  await expect(opened()).toHaveCount(1);
  await page.locator(".stage-view__navigation-button--next button").click();
  await expect(page).toHaveURL(/stage=S-320/);
  await page.goBack();
  await expect(page).toHaveURL(/stage=S-220/);
  await expect(opened()).toHaveCount(1);
  await expect(
    page
      .locator(".problem-gift")
      .nth(0)
      .locator('.gift-box[data-box-state="open"]'),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/stage=S-060/);
  await page.goForward();
  await expect(page).toHaveURL(/stage=S-220/);
  await expect(
    page
      .locator(".problem-gift")
      .nth(2)
      .locator('.gift-box[data-box-state="open"]'),
  ).toBeVisible();
});

test("opens the Beacon box only after an actual offline receipt survives navigation", async ({
  page,
  context,
}) => {
  await page.goto("/?locale=en&stage=S-060");
  await expect(page.locator(".beacon-path")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page.getByRole("button", { name: "Point", exact: true }).click();
  await expect(page.locator(".beacon-path")).toHaveAttribute(
    "data-motion",
    "inside",
  );
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  await context.setOffline(true);
  try {
    await page.getByRole("button", { name: "Point", exact: true }).click();
    await expect(page.locator(".beacon-path")).toHaveAttribute(
      "data-motion",
      "received",
    );
    await expect(
      page
        .locator(".problem-gift")
        .nth(1)
        .locator('.gift-box[data-box-state="open"]'),
    ).toBeVisible();
    await expect(
      page
        .locator(".problem-gift")
        .nth(0)
        .locator('.gift-box[data-box-state="open"]'),
    ).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});
