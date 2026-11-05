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
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
  await open.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(boxes.nth(2)).toHaveAttribute("data-box-state", "open");
});

test("an inside click or abandoned outside press cannot label a later cancel as light dismiss", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-610");
  await page.getByRole("button", { name: "Open dialog", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.click({ position: { x: 10, y: 10 } });
  await dialog.evaluate((node) => (node as HTMLDialogElement).requestClose());
  await expect(
    page.locator(".problem-gift .gift-box").nth(1),
  ).not.toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".problem-gift .gift-box").nth(2)).toHaveAttribute(
    "data-box-state",
    "open",
  );
  await page.getByRole("button", { name: "Open dialog", exact: true }).click();
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  if (!bounds) throw new Error("Missing dialog");
  await page.mouse.move(5, 5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await dialog.evaluate((node) => (node as HTMLDialogElement).requestClose());
  await expect(
    page.locator(".problem-gift .gift-box").nth(1),
  ).not.toHaveAttribute("data-box-state", "open");
});
