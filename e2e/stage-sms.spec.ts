import { expect, type Page, test } from "@playwright/test";

async function fixture(page: Page) {
  await page.addInitScript(() => {
    class OtpFixture {
      type = "otp";
      constructor(public code: string) {}
    }
    Object.defineProperty(window, "OTPCredential", {
      configurable: true,
      value: OtpFixture,
    });
    const requests: {
      signal: AbortSignal;
      resolve: (value: OtpFixture) => void;
    }[] = [];
    Reflect.set(window, "otpFixtureRequests", requests);
    navigator.credentials.get = (options) =>
      new Promise((resolve) => {
        const signal = options?.signal;
        if (!signal) throw new Error("No abort signal");
        requests.push({
          signal,
          resolve: (value) => resolve(value as Credential),
        });
      });
    Reflect.set(window, "deliverOtpFixture", (index: number, code: string) =>
      requests[index]?.resolve(new OtpFixture(code)),
    );
    const matches = HTMLInputElement.prototype.matches;
    HTMLInputElement.prototype.matches = function (selector) {
      if (
        selector === ":autofill" &&
        this.autocomplete === "one-time-code" &&
        Reflect.get(window, "otpAutofillFixture")
      )
        return true;
      return matches.call(this, selector);
    };
  });
}
async function code(page: Page) {
  const value = (await page.locator(".s750-sms").innerText()).match(
    /#(\d{6})$/,
  )?.[1];
  if (!value) throw new Error("No current SMS code");
  return value;
}
const start = (page: Page) =>
  page.getByRole("button", { name: /^SMS speech bubble:/ }).click();
const gift = (page: Page) => page.locator(".s750-puzzle .gift-box");

test("native typing and clipboard copy do not clear; a controlled matching OTP credential does, while a reset invalidates old replies", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await fixture(page);
  await page.goto("/?locale=en&stage=S-750");
  const input = page.getByRole("textbox", {
    name: "One-time code",
    exact: true,
  });
  const first = await code(page);
  expect(
    await page.evaluate(() => Reflect.get(window, "otpFixtureRequests").length),
  ).toBe(0);
  await input.fill(first);
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await start(page);
  await expect(input).toHaveValue("");
  await input.fill(first);
  expect(await input.evaluate((el) => el.matches(":autofill"))).toBe(false);
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await page
    .getByRole("button", { name: "Copy SMS body", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).replaceAll(
      "\r\n",
      "\n",
    ),
  ).toBe(await page.locator(".s750-sms").innerText());
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: "New code", exact: true }).click();
  const second = await code(page);
  expect(second).not.toBe(first);
  expect(
    await page.evaluate(
      () => Reflect.get(window, "otpFixtureRequests")[0].signal.aborted,
    ),
  ).toBe(true);
  await page.evaluate(
    (value) => Reflect.get(window, "deliverOtpFixture")(0, value),
    first,
  );
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await start(page);
  await page.evaluate(
    (value) => Reflect.get(window, "deliverOtpFixture")(1, value),
    second,
  );
  await expect(gift(page)).toHaveAttribute("data-box-state", "open");
  await expect(input).toHaveValue(second);
  await page.screenshot({
    path: info.outputPath("sms-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("sms-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(gift(page)).toHaveAttribute("data-box-state", "closed");
});

test("controlled autofill state still needs an armed empty field, trusted input and no paste contamination; departure aborts pending reads", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/?locale=en&stage=S-750");
  const input = page.getByRole("textbox", {
    name: "One-time code",
    exact: true,
  });
  await page.evaluate(() => Reflect.set(window, "otpAutofillFixture", true));
  await input.fill(await code(page));
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await start(page);
  await input.dispatchEvent("paste");
  await input.fill(await code(page));
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await start(page);
  await input.fill(await code(page));
  await expect(gift(page)).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "otpFixtureRequests").every(
        (r: { signal: AbortSignal }) => r.signal.aborted,
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "New code", exact: true }).click();
  await start(page);
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window, "otpFixtureRequests").every(
          (r: { signal: AbortSignal }) => r.signal.aborted,
        ),
      ),
    )
    .toBe(true);
});
