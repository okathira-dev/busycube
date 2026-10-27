import { chromium, expect, test } from "@playwright/test";

test("native Document PiP carries the box and both real window dimensions must match; closing returns it and leaving closes PiP", async ({
  browserName,
}, info) => {
  expect(browserName).toBe("chromium");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: null,
    deviceScaleFactor: undefined,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/?locale=en&stage=S-850");
  const gift = page.locator(".s850-stage .gift-box");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await gift.click();
  await expect(page.locator(".s850-shadow")).toBeVisible();
  expect(
    await page.evaluate(() => {
      const pip = window.documentPictureInPicture?.window;
      return (
        pip &&
        !pip.closed &&
        pip.document.querySelectorAll(".gift-box").length === 1 &&
        !pip.document.querySelector("button")
      );
    }),
  ).toBe(true);
  const resize = async (width: number, height: number) => {
    // resizeTo is native and requires activation, which Playwright's evaluation
    // supplies. No resize event or window dimension is mocked.
    await page.evaluate(
      ({ width, height }) => {
        const pip = window.documentPictureInPicture?.window;
        if (!pip) throw new Error("Missing real PiP window");
        pip.resizeTo(
          width + pip.outerWidth - pip.innerWidth,
          height + pip.outerHeight - pip.innerHeight,
        );
      },
      { width, height },
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const pip = window.documentPictureInPicture?.window;
          return pip ? [pip.innerWidth, pip.innerHeight] : [];
        }),
      )
      .toEqual([width, height]);
  };
  await resize(360, 240);
  expect(
    await page.evaluate(() =>
      window.documentPictureInPicture?.window?.document
        .querySelector(".gift-box")
        ?.getAttribute("data-box-state"),
    ),
  ).toBe("ribboned");
  await resize(432, 360); // correct ratio, wrong size
  expect(
    await page.evaluate(() =>
      window.documentPictureInPicture?.window?.document
        .querySelector(".gift-box")
        ?.getAttribute("data-box-state"),
    ),
  ).toBe("ribboned");
  await page.evaluate(() => window.documentPictureInPicture?.window?.close());
  await expect(page.locator(".s850-shadow")).toHaveCount(0);
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await gift.click();
  await expect(page.locator(".s850-shadow")).toBeVisible();
  await resize(360, 300);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.documentPictureInPicture?.window?.document
          .querySelector(".gift-box")
          ?.getAttribute("data-box-state"),
      ),
    )
    .toBe("open");
  const dimensions = await page.evaluate(() => {
    const reference = document
      .querySelector(".s850-shadow .gift-box")
      ?.getBoundingClientRect();
    const actual = window.documentPictureInPicture?.window?.document
      .querySelector(".gift-box")
      ?.getBoundingClientRect();
    return (
      reference &&
      actual &&
      Math.abs(reference.width - actual.width) < 1 &&
      Math.abs(reference.height - actual.height) < 1
    );
  });
  expect(dimensions).toBe(true);
  await page.screenshot({ path: info.outputPath("document-pip-main.png") });
  const floating = context.pages().find((candidate) => candidate !== page);
  if (floating)
    await floating.screenshot({
      path: info.outputPath("document-pip-floating.png"),
    });
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !window.documentPictureInPicture?.window ||
          window.documentPictureInPicture.window.closed,
      ),
    )
    .toBe(true);
  await page.goto("http://127.0.0.1:4173/?locale=en&stage=S-850");
  await expect(gift).toHaveAttribute("data-box-state", "closed");
  await context.close();
  await browser.close();
});

test("a delayed native PiP open after SPA departure is closed and never opens the new box", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-850");
  await expect(page.locator(".s850-stage .gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await page.evaluate(() => {
    const api = window.documentPictureInPicture;
    if (!api) throw new Error("Missing native PiP");
    const original = api.requestWindow.bind(api);
    const f = { release: () => {}, window: null as Window | null };
    Reflect.set(window, "pipFixture", f);
    const gate = new Promise<void>((resolve) => {
      f.release = resolve;
    });
    api.requestWindow = async (options) => {
      f.window = await original(options);
      await gate;
      return f.window;
    };
  });
  await page.locator(".s850-stage .gift-box").click();
  await expect
    .poll(() => page.evaluate(() => !!Reflect.get(window, "pipFixture").window))
    .toBe(true);
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect(page.locator(".s850-stage")).toHaveCount(0);
  await page.evaluate(() => Reflect.get(window, "pipFixture").release());
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "pipFixture").window.closed),
    )
    .toBe(true);
  await page.goto("/?locale=en&stage=S-850");
  await expect(page.locator(".s850-stage .gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
});
