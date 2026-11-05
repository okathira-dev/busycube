import { expect, test } from "@playwright/test";

test("shows the target code, keeps the box neutral, and displays normalized picker results", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    // Controlled colour-result fixture; this does not represent screen-pixel selection.
    const colours = ["#a78bf9", "#A78BFA"];
    Reflect.set(
      window,
      "EyeDropper",
      class {
        async open() {
          return { sRGBHex: colours.shift() ?? "" };
        }
      },
    );
  });
  await page.goto("/?locale=en&stage=S-260");
  const box = page.locator(".problem-gift .gift-box");
  await expect(page.locator(".s260-target")).toHaveText("#a78bfa");
  await expect(page.locator(".eyedropper-target")).toHaveCount(0);
  await expect(page.locator(".s260-swatch")).toHaveCount(0);
  expect(
    await box.evaluate((node) =>
      (node as HTMLElement).style.getPropertyValue("--gift-color"),
    ),
  ).not.toBe("#a78bfa");
  const picker = page.getByRole("button", { name: /^Eyedropper:/ });
  await picker.click();
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".s260-picked")).toHaveText("#a78bf9");
  await picker.click();
  await expect(box).toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".s260-swatch")).toHaveCSS(
    "background-color",
    "rgb(167, 139, 250)",
  );
  await page.screenshot({ path: testInfo.outputPath("eyedropper-result.png") });
});

test("an unavailable native picker or a native request aborted on departure cannot open the box", async ({
  playwright,
  baseURL,
}, testInfo) => {
  const browser = await playwright.chromium.launch({
    headless: true,
    channel: "chromium",
  });
  try {
    const page = await browser.newPage({ baseURL });
    await page.addInitScript(() => {
      const Api = Reflect.get(window, "EyeDropper") as
        | (new () => {
            open(options?: {
              signal?: AbortSignal;
            }): Promise<{ sRGBHex: string }>;
          })
        | undefined;
      if (!Api) {
        Reflect.set(window, "nativeDropperObservation", "API absent");
        return;
      }
      const open = Api.prototype.open;
      Api.prototype.open = async function (options) {
        Reflect.set(window, "nativeDropperObservation", "pending");
        try {
          return await open.call(this, options);
        } catch (error) {
          Reflect.set(
            window,
            "nativeDropperObservation",
            error instanceof Error ? error.name : "unknown",
          );
          throw error;
        }
      };
    });
    await page.goto("/?locale=en&stage=S-260");
    await page.getByRole("button", { name: /^Eyedropper:/ }).click();
    await expect(page.locator(".problem-gift .gift-box")).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
    // Headless native chrome does not deliver Escape to the OS picker. Invoke the
    // normal stage-navigation handler and observe the real API's AbortSignal.
    await page
      .getByRole("button", { name: /Next stage/ })
      .evaluate((button) => {
        if (button instanceof HTMLButtonElement) button.click();
      });
    await expect
      .poll(() =>
        page.evaluate(() => Reflect.get(window, "nativeDropperObservation")),
      )
      .not.toBe("pending");
    const observed = await page.evaluate(() =>
      Reflect.get(window, "nativeDropperObservation"),
    );
    console.log("Native EyeDropper observation", observed);
    expect(["API absent", "AbortError", "NotSupportedError"]).toContain(
      observed,
    );
    await testInfo.attach("native-picker-observation", {
      body: JSON.stringify({ observed }),
      contentType: "application/json",
    });
    await expect(page.locator(".s260-target")).toHaveCount(0);
  } finally {
    await browser.close();
  }
});
