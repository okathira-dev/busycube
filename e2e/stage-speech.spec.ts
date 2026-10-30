import { expect, test } from "@playwright/test";

test("uses the merged typing clue without requiring speech and does not reward the hint", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-580");
  const boxes = page.locator(".problem-gift .gift-box");
  await expect(boxes).toHaveCount(2);
  await page.getByRole("button", { name: "Speaker", exact: true }).click();
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  const input = page.getByRole("textbox", { name: "Input", exact: true });
  await expect(input).toHaveAttribute("placeholder", "busycube");
  await input.fill("Busycube");
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  await input.fill("busycube");
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(1)).not.toHaveAttribute("data-box-state", "open");
});
