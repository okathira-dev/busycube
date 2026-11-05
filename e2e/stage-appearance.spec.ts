import { expect, test } from "@playwright/test";

test.use({
  deviceScaleFactor: 2,
  colorScheme: "dark",
  reducedMotion: "reduce",
});

test("observes browser media settings, real viewport changes and print preparation", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-930");
  const boxes = page.locator(".problem-gift .gift-box");
  await expect(boxes).toHaveCount(10);
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(2)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(6)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(8)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(7)).not.toHaveAttribute("data-box-state", "open");
  await page.setViewportSize({ width: 400, height: 800 });
  await expect(boxes.nth(5)).toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".appearance-puzzle")).toHaveAttribute(
    "data-portrait",
    "true",
  );
  await page.screenshot({
    path: testInfo.outputPath("appearance-portrait.png"),
    fullPage: true,
  });
  await page.pdf({ path: testInfo.outputPath("print.pdf") });
  await expect(boxes.nth(9)).toHaveAttribute("data-box-state", "open");
});

test("keeps four text-size bands in S-480 without preference override controls", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-480");
  const boxes = page.locator(".problem-gift .gift-box");
  await expect(boxes).toHaveCount(4);
  await expect(page.locator(".font-sample")).toHaveText("A");
  await expect(page.locator(".stage-view__puzzle .stage-action")).toHaveCount(
    0,
  );
  for (const [size, index] of [
    [14, 0],
    [16, 1],
    [20, 2],
    [24, 3],
  ] as const) {
    await page.evaluate((pixels) => {
      document.documentElement.style.fontSize = `${pixels}px`;
    }, size);
    await expect(boxes.nth(index)).toHaveAttribute("data-box-state", "open");
  }
});
