import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test("uses native clipboard write, external document editing and explicit box read", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?locale=en&stage=S-180");
  await expect(
    page.getByRole("button", { name: "Copy", exact: true }),
  ).toBeVisible();
  const restorable = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    if (items.some((item) => item.types.some((type) => type !== "text/plain")))
      return false;
    Reflect.set(
      window,
      "previousClipboardText",
      await navigator.clipboard.readText(),
    );
    return true;
  });
  test.skip(
    !restorable,
    "Preserve an existing non-text clipboard without replacing its formats.",
  );
  try {
    await page.evaluate(() => navigator.clipboard.writeText("busycube"));
    await page.getByRole("button", { name: /^Paste:/ }).click();
    await expect(
      page.locator('.s180-stage .gift-box[data-box-state="open"]'),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(page.locator(".s180-copy")).toHaveAttribute(
      "data-copied",
      "true",
    );
    await expect(page.locator(".s180-stage")).not.toContainText("ebucysub");
    await context.route("**/clipboard-fixture-editor", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><title>Clipboard editor fixture</title><textarea aria-label="External text"></textarea><button id="paste">Paste here</button><button id="copy">Copy back</button><script>const area=document.querySelector("textarea");document.querySelector("#paste").onclick=async()=>{area.value=await navigator.clipboard.readText()};document.querySelector("#copy").onclick=()=>navigator.clipboard.writeText(area.value);</script>',
      }),
    );
    const editor = await context.newPage();
    await editor.goto("/clipboard-fixture-editor");
    await editor
      .getByRole("button", { name: "Paste here", exact: true })
      .click();
    await expect(
      editor.getByRole("textbox", { name: "External text" }),
    ).toHaveValue("ebucysub");
    await editor
      .getByRole("textbox", { name: "External text" })
      .fill("busycube");
    await editor
      .getByRole("button", { name: "Copy back", exact: true })
      .click();
    await expect
      .poll(() => editor.evaluate(() => navigator.clipboard.readText()))
      .toBe("busycube");
    await page.bringToFront();
    await page.getByRole("button", { name: /^Paste:/ }).click();
    await expect(
      page.locator('.s180-stage .gift-box[data-box-state="open"]'),
    ).toHaveCount(1);
    await editor.close();
  } finally {
    await page.bringToFront();
    await page.evaluate(() =>
      navigator.clipboard.writeText(
        Reflect.get(window, "previousClipboardText") ?? "",
      ),
    );
  }
});
