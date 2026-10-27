import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test("native copy decodes only the selected cipher and native paste of the answer opens the box", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?locale=en&stage=S-500");
  await expect(page.locator(".cipher-text")).toBeVisible();
  const restorable = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    if (items.some((item) => item.types.some((type) => type !== "text/plain")))
      return false;
    Reflect.set(
      window,
      "previousCipherClipboard",
      await navigator.clipboard.readText(),
    );
    return true;
  });
  test.skip(!restorable, "Preserve existing non-text clipboard formats.");
  const input = page.getByRole("textbox", { name: "Return it here" });
  const box = page.locator(".problem-gift .gift-box");
  try {
    await page.evaluate(() => navigator.clipboard.writeText("busycube"));
    await input.click();
    await page.keyboard.press("Control+v");
    await expect(input).toHaveValue("busycube");
    await expect(box).not.toHaveAttribute("data-box-state", "open");
    async function copySelection(text?: string) {
      await page.locator(".cipher-text").click();
      await page.locator(".cipher-text").evaluate((root, text) => {
        const node = root.firstChild;
        const selection = document.getSelection();
        if (!node || !selection) throw new Error("No native selection");
        const content = root.textContent ?? "";
        const start = text ? content.indexOf(text) : 0;
        if (start < 0) throw new Error("Cipher fixture not found");
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, text ? start + text.length : content.length);
        selection.removeAllRanges();
        selection.addRange(range);
      }, text);
      await page.keyboard.press("Control+c");
    }
    async function paste() {
      await input.click();
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Control+v");
    }
    await copySelection();
    await paste();
    await expect(input).toHaveValue(
      "follow the quiet marks until busycube appears between the noise",
    );
    await expect(box).not.toHaveAttribute("data-box-state", "open");
    await expect(page.locator(".cipher-result")).toHaveCount(0);
    await copySelection("wkh");
    await paste();
    await expect(input).toHaveValue("the");
    await expect(box).not.toHaveAttribute("data-box-state", "open");
    await copySelection("exvbfxeh");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("busycube");
    await input.fill("busycube");
    await expect(box).not.toHaveAttribute("data-box-state", "open");
    await input.evaluate((node) => {
      const data = new DataTransfer();
      data.setData("text/plain", "busycube");
      node.dispatchEvent(
        new ClipboardEvent("paste", { bubbles: true, clipboardData: data }),
      );
    });
    await expect(box).not.toHaveAttribute("data-box-state", "open");
    await paste();
    await expect(input).toHaveValue("busycube");
    await expect(box).toHaveAttribute("data-box-state", "open");
    await page.screenshot({
      path: testInfo.outputPath("cipher-selection.png"),
    });
  } finally {
    await page.bringToFront();
    await page.evaluate(() =>
      navigator.clipboard.writeText(
        Reflect.get(window, "previousCipherClipboard") ?? "",
      ),
    );
  }
});
