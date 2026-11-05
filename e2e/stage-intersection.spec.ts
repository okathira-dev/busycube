import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`shows a partial rectangle initially and uses native 98 percent intersection at width ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?locale=en&stage=S-840");
    const readRatio = async () =>
      Number.parseFloat(
        (await page.locator(".measurement").textContent()) ?? "",
      );
    await expect.poll(readRatio).toBeGreaterThan(0);
    expect(await readRatio()).toBeLessThan(98);
    const box = page.locator(".problem-row .gift-box");
    await expect(box).toHaveAttribute("data-box-state", "ribboned");
    const scrollToCrop = async (crop: number) =>
      page.locator(".s840-scroll-root").evaluate((node, fraction) => {
        const root = node as HTMLElement;
        const target = root.querySelector<HTMLElement>(".s840-target");
        if (!target) throw new Error("Missing target");
        root.scrollTop = target.offsetTop;
        root.scrollLeft = target.offsetLeft + target.offsetWidth * fraction;
      }, crop);
    await scrollToCrop(0.03);
    await expect.poll(readRatio).toBeGreaterThan(96);
    expect(await readRatio()).toBeLessThan(98);
    await expect(box).toHaveAttribute("data-box-state", "ribboned");
    const previous = await readRatio();
    await scrollToCrop(0.025);
    await expect.poll(readRatio).toBeGreaterThan(previous);
    await expect(box).toHaveAttribute("data-box-state", "ribboned");
    await scrollToCrop(0.01);
    await expect.poll(readRatio).toBeGreaterThanOrEqual(98);
    await expect(box).toHaveAttribute("data-box-state", "open");
  });
}
