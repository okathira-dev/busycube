import { expect, test } from "@playwright/test";

async function pickerFixture(
  page: import("@playwright/test").Page,
  answers: string[],
) {
  await page.addInitScript((queued) => {
    const calls: {
      properties: readonly string[];
      options: { multiple: false };
    }[] = [];
    Reflect.set(window, "contactPickerCalls", calls);
    Object.defineProperty(navigator, "contacts", {
      configurable: true,
      value: {
        async select(
          properties: readonly string[],
          options: { multiple: false },
        ) {
          calls.push({ properties: [...properties], options });
          const answer = queued.shift();
          if (answer === "cancel")
            throw new DOMException("Cancelled", "AbortError");
          if (answer === "zero") return [];
          if (answer === "partial")
            return [{ name: ["private contact fixture"] }];
          if (answer === "multiple") return [{}, {}];
          if (answer === "empty") return [{}];
          if (answer === "full")
            return [
              {
                name: ["Busycube Courier", "private contact fixture"],
                email: ["COURIER@BUSYCUBE.INVALID"],
                tel: ["+81 3-0000-0000"],
                address: [
                  {
                    addressLine: ["1-1-1 Busycube"],
                    city: "Tokyo",
                    postalCode: "100-0001",
                    country: "Japan",
                  },
                ],
                icon: [
                  new Blob(["a different icon, still a nonempty Blob"], {
                    type: "image/png",
                  }),
                ],
              },
            ];
          throw new Error("No fixture answer");
        },
      },
    });
  }, answers);
}

for (const order of [
  ["full", "empty"],
  ["empty", "full"],
]) {
  test(`contact boxes use the same picker and allow ${order.join(" then ")}`, async ({
    page,
  }, testInfo) => {
    await pickerFixture(page, order);
    const posted: string[] = [];
    page.on("request", (request) => {
      const body = request.postData();
      if (body) posted.push(body);
    });
    await page.goto("/?locale=en&stage=S-760");
    const full = page.getByRole("button", { name: /^Contact card:/ });
    const empty = page.getByRole("button", { name: /^Slashed contact card:/ });
    await expect(full).toBeVisible();
    await expect(empty).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pick the full card" }),
    ).toHaveCount(0);
    await expect(page.locator(".s760-card img")).toBeVisible();
    for (const [index, mode] of order.entries()) {
      await (mode === "full" ? full : empty).click();
      await expect(
        page.locator(".gift-box").nth(mode === "full" ? 0 : 1),
      ).toHaveAttribute("data-box-state", "open");
      if (index === 0)
        await expect(
          page.locator(".gift-box").nth(mode === "full" ? 1 : 0),
        ).not.toHaveAttribute("data-box-state", "open");
    }
    const calls = await page.evaluate(() =>
      Reflect.get(window, "contactPickerCalls"),
    );
    expect(calls).toEqual(
      Array.from({ length: 2 }, () => ({
        properties: ["name", "email", "tel", "address", "icon"],
        options: { multiple: false },
      })),
    );
    await expect(page.locator("body")).not.toContainText(
      "private contact fixture",
    );
    expect(posted.join("\n")).not.toContain("private contact fixture");
    await page.screenshot({
      path: testInfo.outputPath("contact-card.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("contact-card-mobile.png"),
      fullPage: true,
    });
  });
}

test("empty sharing requires one selected contact and rejects cancellation or partial data", async ({
  page,
}) => {
  await pickerFixture(page, ["cancel", "zero", "partial", "multiple", "empty"]);
  await page.goto("/?locale=en&stage=S-760");
  const empty = page.getByRole("button", { name: /^Slashed contact card:/ });
  const box = page.locator(".gift-box").nth(1);
  for (let i = 0; i < 4; i++) {
    await empty.click();
    await expect(page.getByRole("status")).not.toHaveText("Waiting");
    await expect(box).not.toHaveAttribute("data-box-state", "open");
    await expect(page.locator("body")).not.toContainText(
      "private contact fixture",
    );
  }
  await empty.click();
  await expect(box).toHaveAttribute("data-box-state", "open");
});

test("shared settings explain fictional contacts and OS cleanup in both languages", async ({
  page,
}) => {
  await page.goto("/?locale=en&view=settings");
  await expect(
    page.getByText(/Use fictional contacts instead of real contacts/),
  ).toBeVisible();
  await expect(page.getByText(/Delete any contacts you created/)).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).click();
  await page.getByRole("option", { name: "日本語", exact: true }).click();
  await expect(
    page.getByText(/実在の連絡先ではなく架空の連絡先/),
  ).toBeVisible();
  await expect(page.getByText(/端末の連絡先アプリから削除/)).toBeVisible();
});
