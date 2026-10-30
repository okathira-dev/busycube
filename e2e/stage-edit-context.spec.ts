import { expect, test } from "@playwright/test";

test("native composition stays uncompleted until committed", async ({
  page,
  context,
}) => {
  await page.goto("/?locale=ja&stage=S-860");
  const line = page.locator(".s860-proof [role=textbox]").first();
  await line.click();
  await page.keyboard.press("ControlOrMeta+A");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.imeSetComposition", {
    text: "Busycube",
    selectionStart: 8,
    selectionEnd: 8,
  });
  await expect(line).toHaveText("Busycube");
  await expect(
    page.locator(".problem-row .gift-box").first(),
  ).not.toHaveAttribute("data-box-state", "open");
  await page.keyboard.insertText("Busycube");
  await expect(page.locator(".problem-row .gift-box").first()).toHaveAttribute(
    "data-box-state",
    "open",
  );
  await cdp.detach();
});

for (const language of ["ja", "en"]) {
  test(`native deletion and rapid insertion retain the caret in ${language}`, async ({
    page,
  }) => {
    await page.goto(`/?locale=${language}&stage=S-860`);
    const line = page.locator(".s860-proof [role=textbox]").first();
    await expect(line).toHaveText("Busycuve");
    await line.click();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText("b");
    await expect(line).toHaveText("Busycube");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.insertText("U");
    await expect(line).toHaveText("BUsycube");
  });
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
    await expect
      .poll(() =>
        lines
          .nth(0)
          .evaluate(
            (node) => (node as HTMLElement).editContext?.selectionStart,
          ),
      )
      .toBe(8);
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(() =>
        lines
          .nth(0)
          .evaluate(
            (node) => (node as HTMLElement).editContext?.selectionStart,
          ),
      )
      .toBe(7);
    await page.keyboard.press("Backspace");
    await expect(lines.nth(0)).toHaveText("Busycue");
    await expect
      .poll(() =>
        lines
          .nth(0)
          .evaluate(
            (node) => (node as HTMLElement).editContext?.selectionStart,
          ),
      )
      .toBe(6);
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
