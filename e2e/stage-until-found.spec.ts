import { expect, test } from "@playwright/test";

for (const language of ["ja", "en"]) {
  test(`reveals both localized targets through real browser match in ${language}`, async ({
    page,
  }) => {
    await page.goto(`/?locale=${language}&stage=S-800`);
    const code = page.locator(".s800-prompts code");
    await expect(code).toBeVisible();
    const directive = await code.textContent();
    const targets = page.locator(".s800-article section");
    await expect(targets.nth(0)).toHaveAttribute("hidden", "until-found");
    const url = new URL(page.url());
    url.hash = directive ?? "";
    // Browser navigation invokes matching; no synthetic beforematch event.
    await page.goto(url.href);
    await expect(targets.nth(0)).not.toHaveAttribute("hidden");
    await expect(
      page.locator('.stage-view .gift-box[data-box-state="open"]'),
    ).toHaveCount(1);
    url.hash = `:~:text=${encodeURIComponent((await targets.nth(1).textContent()) ?? "")}`;
    await page.goto(url.href);
    await expect(targets.nth(1)).not.toHaveAttribute("hidden");
    await expect(
      page.locator('.stage-view .gift-box[data-box-state="open"]'),
    ).toHaveCount(2);
  });
}
