import { expect, test } from "@playwright/test";

test("keeps the three native close paths after replacing instructions with icons", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-610");
  const boxes = page.locator(".problem-gift .gift-box");
  const open = page.getByRole("button", { name: "Open dialog", exact: true });
  await open.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  await open.click();
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
  await open.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(boxes.nth(2)).toHaveAttribute("data-box-state", "open");
});
