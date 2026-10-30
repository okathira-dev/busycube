import { expect, test } from "@playwright/test";

test("follows fixed native text-fragment links to the two-word cycle and requires the exact answer", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-690");
  const links = page.locator(".s690-article [data-word]");
  await expect(links).toHaveCount(174);
  const before = await links.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href")),
  );
  const firstDestination = (await links.first().getAttribute("href"))?.split(
    ":~:",
  )[0];
  await links.first().focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => page.evaluate(() => location.hash))
    .toBe(firstDestination);
  await expect(links).toHaveCount(174);
  expect(
    await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    ),
  ).toEqual(before);
  let current = 0;
  const seen = new Set<number>();
  while (!seen.has(current)) {
    seen.add(current);
    const href = before[current] ?? "";
    const destination = Number(href.match(/#s690-word-(\d+):/)?.[1]);
    expect(Number.isInteger(destination)).toBe(true);
    await links.nth(current).click();
    await expect
      .poll(() => page.evaluate(() => location.hash))
      .toBe(`#s690-word-${destination}`);
    current = destination;
    expect(seen.size).toBeLessThanOrEqual(8);
  }
  expect(await links.nth(current).textContent()).toMatch(/^(directed|graph,)$/);
  await page.screenshot({
    path: testInfo.outputPath("native-highlight.png"),
    fullPage: true,
  });
  await links.filter({ hasText: /^graph,$/ }).click();
  await page.screenshot({
    path: testInfo.outputPath("directed-highlight.png"),
    fullPage: true,
  });
  await links.filter({ hasText: /^directed$/ }).click();
  await page.screenshot({
    path: testInfo.outputPath("graph-highlight.png"),
    fullPage: true,
  });
  const box = page.locator('.stage-view .gift-box[data-box-state="open"]');
  await expect(box).toHaveCount(0);
  const input = page.getByPlaceholder("□_□");
  for (const wrong of [
    "busycube{text_fragments_leave_trails}",
    "DIRECTED_GRAPH",
    " directed_graph",
  ]) {
    await input.fill(wrong);
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(box).toHaveCount(0);
  }
  await input.fill("directed_graph");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(box).toHaveCount(1);
});
