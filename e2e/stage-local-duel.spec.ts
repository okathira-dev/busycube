import { expect, test } from "@playwright/test";

test("ranking clues lead to three wins through freshly matched native tabs", async ({
  page,
  context,
}, info) => {
  await page.goto("/?locale=en&stage=S-940");
  await expect(page.locator(".s940-ranking li").first()).toContainText(
    "sora_4821",
  );
  await expect(page.locator(".s940-ranking li").last()).toContainText(
    "sora_4821_sub",
  );
  await expect(page.locator(".s940-ranking li")).toHaveCount(30);
  const ranking = page.locator(".s940-ranking-scroll");
  expect(
    await ranking.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await page.locator(".s940-ranking li").last().scrollIntoViewIfNeeded();
  expect(await ranking.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: "Rated rankings" }),
  ).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill("sora_sub");
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(page.locator(".s940-account")).toHaveText("sora_sub");
  const second = await context.newPage();
  await second.goto("/?locale=en&stage=S-940");
  const gift = page.locator(".s940-stage .gift-box");
  for (let n = 0; n < 3; n++) {
    const label = n === 0 ? "Find match" : "Next match";
    await page.getByRole("button", { name: label, exact: true }).click();
    if (n === 0) {
      await page.waitForTimeout(2200);
      await expect(page.getByRole("status")).toHaveText("Finding an opponent");
    }
    await second.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(".s940-arena strong").last()).toHaveText(
      await second.locator(".s940-account").innerText(),
    );
    await second.getByRole("button", { name: "Scissors", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "Opponent", exact: true }),
    ).toHaveText("?");
    await page.getByRole("button", { name: "Rock", exact: true }).click();
    await expect(page.locator(".s940-streak")).toHaveAttribute(
      "aria-label",
      `${n + 1} / 3`,
    );
    await expect(gift).toHaveAttribute(
      "data-box-state",
      n === 2 ? "open" : "ribboned",
    );
  }
  await page.screenshot({ path: info.outputPath("three-wins.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("duel-mobile.png"),
    fullPage: true,
  });
  await second.close();
});
