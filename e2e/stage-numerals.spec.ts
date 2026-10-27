import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const problems: Array<{ leftValue: number; rightValue: number }> = JSON.parse(
  readFileSync(
    new URL("../src/fixtures/unicode/product-problems.json", import.meta.url),
    "utf8",
  ),
);

test("places each fixed addition beside its box and lays out Mayan place values vertically", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-620");
  const cards = page.locator(".numeral-problem");
  await expect(cards).toHaveCount(17);
  await expect(
    page.getByRole("textbox", { name: "Answer", exact: true }),
  ).toHaveCount(17);
  await expect(cards.nth(0).locator("input")).toBeEnabled();
  await cards.nth(0).locator("input").fill("579");
  await expect(cards.nth(0).locator(".gift-box")).not.toHaveAttribute(
    "data-box-state",
    "open",
  );
  for (const [index, fixture] of problems.entries()) {
    await cards
      .nth(index)
      .locator("input")
      .fill(String(fixture.leftValue + fixture.rightValue));
    await expect(cards.nth(index).locator(".gift-box")).toHaveAttribute(
      "data-box-state",
      "open",
    );
  }
  await expect(page.locator(".stage-state")).toHaveText("17/17");
  const mayan = cards.last().locator(".numeral-mayan");
  await expect(mayan).toHaveCount(2);
  for (const operand of await mayan.all()) {
    await expect(operand.locator("span")).toHaveCount(3);
    const tops = await operand
      .locator("span")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().top),
      );
    expect(tops[0]).toBeLessThan(tops[1] ?? 0);
    expect(tops[1]).toBeLessThan(tops[2] ?? 0);
  }
  await cards
    .last()
    .screenshot({ path: testInfo.outputPath("mayan-addition.png") });
});
