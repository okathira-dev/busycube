import { expect, test } from "@playwright/test";

for (const language of ["ja", "en"]) {
  test(`edits the shared hero text through real EditContext in ${language}`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/?locale=${language}&stage=S-860`);
    const lines = page.locator(".s860-proof [role=textbox]");
    await expect(lines).toHaveCount(3);
    await expect(page.locator(".s860-proof .eyebrow")).toHaveText(
      "Web API Explorer",
    );
    await expect(lines.nth(0)).toHaveText("Busycuve");
    await page.screenshot({
      path: testInfo.outputPath("hero-proof.png"),
      fullPage: true,
    });
    const values = [
      "Busycube",
      language === "ja"
        ? "いつものブラウザが、パズルになる。"
        : "Your everyday browser becomes the puzzle.",
      language === "ja"
        ? "ブラウザそのものが鍵となる新感覚パズル。"
        : "A new kind of puzzle game where the browser itself is the key.",
    ];
    await lines.nth(0).click();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText("b");
    await expect(lines.nth(0)).toHaveText("Busycube");
    for (const [index, value] of values.entries()) {
      if (index === 0) continue;
      await lines.nth(index).click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.insertText(value);
      await expect(lines.nth(index)).toHaveText(value);
    }
    await expect(
      page.locator('.problem-row .gift-box[data-box-state="open"]'),
    ).toHaveCount(3);
    expect(
      await lines
        .nth(0)
        .evaluate((node) => (node as HTMLElement).editContext?.text),
    ).toBe("Busycube");
  });
}
