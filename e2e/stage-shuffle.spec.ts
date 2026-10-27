import { expect, test } from "@playwright/test";

test("moves all ten closed boxes in a real transition and retries after a wrong selection", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-340");
  const ring = page.locator(".shuffle-ring");
  const tokens = page.locator(".shuffle-token");
  await expect(ring).toHaveAttribute("data-phase", "showing");
  await expect(tokens).toHaveCount(10);
  await page.screenshot({ path: testInfo.outputPath("shuffle-prompt.png") });
  const winner = await tokens.evaluateAll((elements) =>
    elements.findIndex((element) =>
      element.querySelector('.gift-box[data-box-state="open"]'),
    ),
  );
  expect(winner).toBeGreaterThanOrEqual(0);
  const before = await tokens.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("style")),
  );
  await page
    .getByRole("button", { name: "Opposing arrows", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-phase", "moving");
  await expect(
    page.locator('.shuffle-token .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  for (const button of await tokens.locator("button").all())
    await expect(button).toBeDisabled();
  await expect(ring).toHaveAttribute("data-phase", "choosing");
  const after = await tokens.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("style")),
  );
  expect(after.every((style, index) => style !== before[index])).toBe(true);
  await tokens
    .nth((winner + 1) % 10)
    .locator("button")
    .click();
  await expect(ring).toHaveAttribute("data-phase", "wrong");
  await expect(ring).toHaveAttribute("data-phase", "showing");
  const nextWinner = await tokens.evaluateAll((elements) =>
    elements.findIndex((element) =>
      element.querySelector('.gift-box[data-box-state="open"]'),
    ),
  );
  expect(nextWinner).not.toBe(winner);
  await page
    .getByRole("button", { name: "Opposing arrows", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-phase", "choosing");
  await tokens.nth(nextWinner).locator("button").click();
  await expect(ring).toHaveAttribute("data-phase", "done");
  await expect(page.locator(".stage-state")).toHaveText("1/1");
});

test("opens the timing box from the real animation paused in its target band", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-170");
  await page.getByRole("button", { name: "Pause", exact: true }).focus();
  await page.waitForFunction(() => {
    const progress = document
      .querySelector(".timing-meter__fill")
      ?.getAnimations()[0]
      ?.effect?.getComputedTiming().progress;
    return (
      typeof progress === "number" && progress >= 0.955 && progress <= 0.975
    );
  });
  await page.keyboard.press("Enter");
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
});
