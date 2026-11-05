import { expect, test } from "@playwright/test";

for (const [index, altitude] of [50, 200, 600].entries()) {
  test(`opens altitude layer ${index + 1} on its first native observation`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setGeolocationOverride", {
      latitude: 0,
      longitude: 0,
      accuracy: 1,
      altitude,
      altitudeAccuracy: 1,
    });
    await page.addInitScript(() => {
      const watch = navigator.geolocation.watchPosition.bind(
        navigator.geolocation,
      );
      const clear = navigator.geolocation.clearWatch.bind(
        navigator.geolocation,
      );
      Reflect.set(window, "altitudeReadings", 0);
      navigator.geolocation.watchPosition = (success, error, options) => {
        let id: number | undefined;
        id = watch(
          (position) => {
            Reflect.set(
              window,
              "altitudeReadings",
              Reflect.get(window, "altitudeReadings") + 1,
            );
            success(position);
            // Only one native sample: neither a three-sample nor a five-second gate can pass.
            if (id !== undefined) clear(id);
          },
          error,
          options,
        );
        return id;
      };
    });
    await page.goto("/?locale=en&stage=S-600");
    const boxes = page.locator(".s600-box .gift-box");
    await expect(boxes).toHaveCount(3);
    await expect(boxes.nth(index)).toHaveAttribute("data-box-state", "open", {
      timeout: 2000,
    });
    expect(
      await page.evaluate(() => Reflect.get(window, "altitudeReadings")),
    ).toBe(1);
    for (let other = 0; other < 3; other++)
      if (other !== index)
        await expect(boxes.nth(other)).not.toHaveAttribute(
          "data-box-state",
          "open",
        );
  });
}

test("shows native altitude uncertainty at both boundaries without treating it as a qualified layer", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["geolocation"]);
  const cdp = await context.newCDPSession(page);
  async function sample(altitude: number, altitudeAccuracy: number) {
    await cdp.send("Emulation.setGeolocationOverride", {
      latitude: 0,
      longitude: 0,
      accuracy: 1,
      altitude,
      altitudeAccuracy,
    });
  }
  await sample(100, 1);
  await page.addInitScript(() => {
    const clear = navigator.geolocation.clearWatch.bind(navigator.geolocation);
    const cleared: number[] = [];
    Reflect.set(window, "clearedAltitudeWatches", cleared);
    navigator.geolocation.clearWatch = (id) => {
      cleared.push(id);
      clear(id);
    };
  });
  await page.goto("/?locale=en&stage=S-600");
  const reading = page.locator(".s600-reading");
  const boxes = page.locator(".s600-box .gift-box");
  await expect(reading).toHaveAttribute("data-observed", "true");
  await expect(reading).toHaveAttribute("data-qualified", "false");
  await expect(page.locator(".s600-marker")).toHaveAttribute("cy", "280");
  for (const box of await boxes.all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.screenshot({
    path: testInfo.outputPath("altitude-uncertainty.png"),
    fullPage: true,
  });
  await sample(100, 0);
  await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
  await sample(500, 1);
  await expect(page.locator(".s600-marker")).toHaveAttribute("cy", "140");
  await expect(reading).toHaveAttribute("data-qualified", "false");
  await expect(boxes.nth(2)).not.toHaveAttribute("data-box-state", "open");
  await sample(500, 0);
  await expect(boxes.nth(2)).toHaveAttribute("data-box-state", "open");
  await sample(50, 5);
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: testInfo.outputPath("altitude-layers-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Next stage/ }).click();
  await expect(page.locator(".s600-field")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (Reflect.get(window, "clearedAltitudeWatches") as number[]).length,
      ),
    )
    .toBeGreaterThan(0);
});

test("missing native altitude remains unobserved", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setGeolocationOverride", {
    latitude: 0,
    longitude: 0,
    accuracy: 1,
  });
  await page.goto("/?locale=en&stage=S-600");
  await expect(page.getByRole("status")).toHaveText("Waiting");
  await expect(page.locator(".s600-reading")).toHaveAttribute(
    "data-observed",
    "false",
  );
  await expect(page.locator(".s600-marker")).not.toBeVisible();
  for (const box of await page.locator(".s600-box .gift-box").all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
});

test("native location denial does not supply an altitude", async ({
  page,
  context,
}) => {
  await context.grantPermissions([]);
  await page.goto("/?locale=en&stage=S-600");
  await expect(page.getByRole("status")).toHaveText("Denied");
  await expect(page.locator(".s600-marker")).not.toBeVisible();
  for (const box of await page.locator(".s600-box .gift-box").all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
});
