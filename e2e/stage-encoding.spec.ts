import { expect, test } from "@playwright/test";
import { encodingPocFixtures } from "../src/poc/encoding-fixtures";

test("ships all eight agreed cultural questions and accepts their exact recovered words", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-640");
  await expect(page.locator(".encoding-question-grid code")).toHaveText(
    encodingPocFixtures.map((fixture) => fixture.presentedText),
  );
  const cards = page.locator(".encoding-question-grid article");
  const answers = cards.locator("input");
  await answers.nth(0).fill("русский ящик");
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  await answers.nth(0).fill(encodingPocFixtures[1].expectedText);
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  for (const [index, fixture] of encodingPocFixtures.entries())
    await answers.nth(index).fill(fixture.expectedText);
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(8);
  await expect(page.locator(".stage-state")).toHaveText("8/8");
});
