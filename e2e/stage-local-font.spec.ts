import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const f = {
      queries: [] as unknown[],
      mode: "valid",
      release: () => {},
      created: [] as string[],
      revoked: [] as string[],
    };
    Reflect.set(window, "fontFixture", f);
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      f.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      f.revoked.push(url);
      revoke(url);
    };
    Reflect.set(window, "queryLocalFonts", async (options: unknown) => {
      f.queries.push(options);
      if (f.mode === "hold")
        await new Promise<void>((resolve) => {
          f.release = resolve;
        });
      if (f.mode === "reject")
        throw new DOMException("Denied", "NotAllowedError");
      if (f.mode === "missing") return [];
      const href =
        document.querySelector<HTMLAnchorElement>(".s790-puzzle a")?.href;
      const blob =
        f.mode === "invalid"
          ? new Blob(["wrong font"])
          : await (await fetch(href ?? "")).blob();
      return [
        { postscriptName: "BusycubeKeyTwo-Regular", blob: async () => blob },
      ];
    });
  });
});
test("only OS-returned exact bytes render the four-letter phrase; read alone never clears; leaving releases the actual font", async ({
  page,
}, info) => {
  await page.goto("/?locale=en&stage=S-790");
  const gift = page.locator(".s790-puzzle .gift-box");
  const input = page.getByRole("textbox", { name: "Passphrase" });
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  expect(
    await page.evaluate(() => Reflect.get(window, "fontFixture").queries),
  ).toEqual([]);
  await input.fill("CUBE");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Dedicated font file" }).click();
  expect((await download).suggestedFilename()).toBe("busycube-key.ttf");
  await gift.click();
  await expect(page.locator(".s790-glyph")).toHaveClass(/s790-glyph--ready/);
  expect(
    await page.evaluate(() => Reflect.get(window, "fontFixture").queries),
  ).toEqual([{ postscriptNames: ["BusycubeKeyTwo-Regular"] }]);
  expect(
    await page.evaluate(() =>
      document.fonts.check(
        '64px "Busycube Installed Phrase"',
        "\uE001\uE002\uE003\uE004",
      ),
    ),
  ).toBe(true);
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await page.screenshot({ path: info.outputPath("local-font-pc.png") });
  await input.fill("CUB");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await input.fill(" cube ");
  await expect(gift).toHaveAttribute("data-box-state", "open");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("local-font-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const f = Reflect.get(window, "fontFixture");
        return (
          f.created.length === 0 &&
          f.created.every((url: string) => f.revoked.includes(url)) &&
          ![...document.fonts].some(
            (font) => font.family === "Busycube Installed Phrase",
          )
        );
      }),
    )
    .toBe(true);
  await page.goto("/?locale=en&stage=S-790");
  await expect(gift).toHaveAttribute("data-box-state", "closed");
});
test("missing, mismatching or refused font never clears; a stale query cannot render after leaving", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-790");
  const gift = page.locator(".s790-puzzle .gift-box");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  for (const mode of ["missing", "invalid", "reject"]) {
    await page.evaluate((value) => {
      Reflect.get(window, "fontFixture").mode = value;
    }, mode);
    await gift.click();
    await expect(page.getByRole("status")).not.toHaveText("Waiting");
    await expect(page.locator(".s790-glyph")).not.toHaveClass(
      /s790-glyph--ready/,
    );
    await page.getByRole("textbox", { name: "Passphrase" }).fill("CUBE");
    await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  }
  await page.evaluate(() => {
    Reflect.get(window, "fontFixture").mode = "hold";
  });
  await gift.click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fontFixture").queries.length),
    )
    .toBe(4);
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await page.evaluate(() => {
    const f = Reflect.get(window, "fontFixture");
    f.mode = "valid";
    f.release();
  });
  await page
    .getByRole("heading", { name: "Local font key", exact: true })
    .count();
  expect(
    await page.evaluate(
      () => Reflect.get(window, "fontFixture").created.length,
    ),
  ).toBe(0);
});
