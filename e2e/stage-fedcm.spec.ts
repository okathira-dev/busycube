import { expect, test } from "@playwright/test";

// The provider alone is controlled. No Google account or real token is used.
const provider = `
(() => {
window.fedcmFixture ??= { configs: [], moments: [], prompts: 0, cancels: 0 };
const f = window.fedcmFixture;
window.google = { accounts: { id: {
 initialize(options) { f.configs.push(options); },
 prompt(moment) { f.prompts++; f.moments.push(moment); },
 cancel() { f.cancels++; }
} } };
})();
`;

test("box starts the controlled provider, cancelling delayed loading cannot prompt, and only the current manual FedCM callback clears", async ({
  page,
}, info) => {
  test.skip(
    process.env.BUSYCUBE_E2E_FEDCM_FIXTURE_BUILD !== "1",
    "Requires a local build with the fixture client ID; never use a real account.",
  );
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("https://accounts.google.com/**", async (route) => {
    if (route.request().url() !== "https://accounts.google.com/gsi/client")
      throw new Error("Unexpected provider request");
    requests++;
    if (requests === 1) await gate;
    await route.fulfill({
      contentType: "application/javascript",
      body: provider,
    });
  });
  await page.goto("/?locale=en&stage=S-770");
  const gift = page.locator(".s770-puzzle .gift-box");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  expect(requests).toBe(0);
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect(page.getByRole("status")).toHaveAttribute(
    "aria-label",
    "Running",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  release();
  await expect(page.getByRole("status")).toHaveAttribute(
    "aria-label",
    "Cancelled",
  );
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fedcmFixture")?.prompts ?? 0),
    )
    .toBe(1);
  expect(
    await page.evaluate(
      () => Reflect.get(window, "fedcmFixture").configs[0].auto_select,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(
      () => Reflect.get(window, "fedcmFixture").configs[0].client_id,
    ),
  ).toBe("fixture.apps.googleusercontent.com");
  await page.evaluate(() =>
    Reflect.get(window, "fedcmFixture").configs[0].callback({
      select_by: "fedcm_auto",
      credential: "opaque-fixture",
    }),
  );
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fedcmFixture").prompts),
    )
    .toBe(2);
  await page.evaluate(() =>
    Reflect.get(window, "fedcmFixture").configs[0].callback({
      select_by: "fedcm",
      credential: "opaque-fixture",
    }),
  );
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await page.evaluate(() =>
    Reflect.get(window, "fedcmFixture").configs[1].callback({
      select_by: "fedcm",
      credential: "opaque-fixture",
    }),
  );
  await expect(gift).toHaveAttribute("data-box-state", "open");
  expect(await page.locator(".s770-puzzle").innerText()).not.toContain(
    "opaque-fixture",
  );
  await page.screenshot({
    path: info.outputPath("identity-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("identity-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(gift).toHaveAttribute("data-box-state", "closed");
});

test("SDK failure is retryable, a dismissal or departing with the chooser pending never clears", async ({
  page,
}) => {
  test.skip(
    process.env.BUSYCUBE_E2E_FEDCM_FIXTURE_BUILD !== "1",
    "Requires a local build with the fixture client ID; never use a real account.",
  );
  let requests = 0;
  await page.route("https://accounts.google.com/**", async (route) => {
    requests++;
    if (requests === 1) await route.abort("failed");
    else
      await route.fulfill({
        contentType: "application/javascript",
        body: provider,
      });
  });
  await page.goto("/?locale=en&stage=S-770");
  const gift = page.locator(".s770-puzzle .gift-box");
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect(page.getByRole("status")).toHaveAttribute(
    "aria-label",
    "Unavailable",
  );
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fedcmFixture")?.prompts ?? 0),
    )
    .toBe(1);
  await page.evaluate(() =>
    Reflect.get(window, "fedcmFixture").moments[0]({
      isDismissedMoment: () => true,
    }),
  );
  await expect(page.getByRole("status")).toHaveAttribute(
    "aria-label",
    "Cancelled",
  );
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fedcmFixture").prompts),
    )
    .toBe(2);
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fedcmFixture").cancels),
    )
    .toBe(2);
  await page.evaluate(() =>
    Reflect.get(window, "fedcmFixture").configs[1].callback({
      select_by: "fedcm",
      credential: "opaque-fixture",
    }),
  );
  await page.locator('[data-stage-id="S-770"] .stage-card__action').click();
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
});

test("normal build stays closed for unavailable configuration or provider", async ({
  page,
}) => {
  test.skip(
    process.env.BUSYCUBE_E2E_FEDCM_FIXTURE_BUILD === "1",
    "Checks the normal build instead of the fixture client ID.",
  );
  await page.route("https://accounts.google.com/**", (route) =>
    route.abort("failed"),
  );
  await page.goto("/?locale=en&stage=S-770");
  await page.getByRole("button", { name: /^Identity card:/ }).click();
  await expect(page.getByRole("status")).toHaveAttribute(
    "aria-label",
    /^(Not configured|Unavailable)$/,
  );
  await expect(page.locator(".s770-puzzle .gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
});
