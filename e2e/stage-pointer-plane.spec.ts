import { expect, test } from "@playwright/test";

test("opens all distant boxes from actual locked movement and exits on plane click", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-820");
  const plane = page.getByRole("button", {
    name: "Virtual plane",
    exact: true,
  });
  await plane.scrollIntoViewIfNeeded();
  const bounds = await plane.boundingBox();
  if (!bounds) throw new Error("Missing plane");
  const start = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  await plane.click();
  await expect(page.locator(".s820-plane")).toHaveAttribute(
    "data-locked",
    "true",
  );
  const background = await page
    .locator(".s820-plane")
    .evaluate((node) => (node as HTMLElement).style.backgroundPosition);
  let previous = { x: 0, y: 0 };
  for (const [index, target] of [
    { x: 800, y: -600 },
    { x: -3000, y: 4000 },
    { x: 6000, y: 8000 },
  ].entries()) {
    for (let step = 1; step <= 100; step++)
      await page.mouse.move(
        start.x + previous.x + ((target.x - previous.x) * step) / 100,
        start.y + previous.y + ((target.y - previous.y) * step) / 100,
      );
    await expect(
      page.locator(".problem-row .gift-box").nth(index),
    ).toHaveAttribute("data-box-state", "open");
    if (index === 0)
      expect(
        await page
          .locator(".s820-plane")
          .evaluate((node) => (node as HTMLElement).style.backgroundPosition),
      ).not.toBe(background);
    previous = target;
  }
  await page.mouse.click(start.x + previous.x, start.y + previous.y);
  await expect(page.locator(".s820-plane")).toHaveAttribute(
    "data-locked",
    "false",
  );
});
