import { expect, test } from "@playwright/test";
import { encodingPocFixtures } from "../src/poc/encoding-fixtures";

test("ships all eight agreed cultural questions and accepts their exact recovered words", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-640");
  await expect(page.locator(".encoding-question-grid code")).toHaveText(
    encodingPocFixtures.map((fixture) => fixture.presentedText),
  );
  const answer = page.locator(".parallel-answer input");
  await answer.fill("русский ящик");
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  for (const fixture of encodingPocFixtures)
    await answer.fill(fixture.expectedText);
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(8);
  await expect(page.locator(".stage-state")).toHaveText("8/8");
});
