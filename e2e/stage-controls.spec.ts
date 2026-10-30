import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("requires the downloaded anagram to be edited before uploading the answer", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-130");
  await expect(page.locator(".problem-gift")).toHaveCount(1);
  const received = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await received;
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  if (!filePath) throw new Error("download missing");
  expect(await readFile(filePath, "utf8")).toBe("ucbeybsu");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(filePath);
  await expect(page.locator(".stage-view [role=status]")).toHaveText("Invalid");
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  await input.setInputFiles({
    name: "puzzle.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("busycube\r\n"),
  });
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(1);
});

test("requires keyboard confirmation for each of the three keyboard-only controls", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-150");
  const boxes = page.locator(".problem-gift .gift-box");
  const first = page.locator(".keyboard-control .gift-box__control");
  await expect(first).toBeVisible();
  const rect = await first.boundingBox();
  if (!rect) throw new Error("box missing");
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  await first.focus();
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  await first.press("Enter");
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  const select = page.getByRole("listbox", { name: "Menu", exact: true });
  await first.press("Tab");
  await expect(select).toBeFocused();
  await select.press("o");
  await expect(select).toHaveValue("open busycube");
  await expect(boxes.nth(1)).not.toHaveAttribute("data-box-state", "open");
  await select.press("Enter");
  await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
  await page.locator("summary").nth(1).focus();
  await page.locator("summary").nth(1).press("Enter");
  await expect(boxes.nth(2)).not.toHaveAttribute("data-box-state", "open");
  await page.locator("summary").nth(1).press("Tab");
  await expect(
    page.getByRole("button", { name: "Circle", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(boxes.nth(2)).toHaveAttribute("data-box-state", "open");
});
