import { expect, test } from "@playwright/test";

test("maps native measured displacement after both accuracies to rings and preserves the session anchor", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 0, longitude: 0, accuracy: 1 });
  await page.addInitScript(() => {
    const geolocation = navigator.geolocation;
    const watch = geolocation.watchPosition.bind(geolocation);
    const clear = geolocation.clearWatch.bind(geolocation);
    const active = new Set<number>();
    const cleared: number[] = [];
    Reflect.set(window, "activeLocationWatches", active);
    Reflect.set(window, "clearedLocationWatches", cleared);
    geolocation.watchPosition = (...args) => {
      const id = watch(...args);
      active.add(id);
      return id;
    };
    geolocation.clearWatch = (id) => {
      active.delete(id);
      cleared.push(id);
      clear(id);
    };
  });
  await page.goto("/?locale=en&stage=S-590");
  const indicator = page.locator(".s590-indicator");
  const boxes = page.locator(".s590-box .gift-box");
  await expect(indicator).toHaveAttribute("cx", "300");
  await expect(boxes).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveText("Active");
  async function move(meters: number) {
    await context.setGeolocation({
      latitude: ((meters / 6371000) * 180) / Math.PI,
      longitude: 0,
      accuracy: 1,
    });
  }
  await move(6.9);
  await expect
    .poll(async () => Number(await indicator.getAttribute("cx")))
    .toBeGreaterThan(360);
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".s590-ring").nth(0)).toHaveAttribute(
    "data-reached",
    "false",
  );
  await move(7.1);
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".s590-ring").nth(0)).toHaveAttribute(
    "data-reached",
    "true",
  );
  await move(0);
  await expect(indicator).toHaveAttribute("cx", "300");
  await expect(boxes.nth(1)).not.toHaveAttribute("data-box-state", "open");
  await move(27.1);
  await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(2)).not.toHaveAttribute("data-box-state", "open");
  await page.reload();
  await expect
    .poll(async () => Number(await indicator.getAttribute("cx")))
    .toBeGreaterThan(420);
  const anchor = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("busycube:S-590:anchor") ?? "null"),
  );
  expect(anchor).toMatchObject({ latitude: 0, longitude: 0, accuracy: 1 });
  await page.screenshot({
    path: testInfo.outputPath("distance-rings.png"),
    fullPage: true,
  });
  await move(102.1);
  await expect(boxes.nth(2)).toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".s590-distance")).toHaveAttribute(
    "data-outside",
    "true",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("busycube:S-590:anchor")),
  ).toBeNull();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: testInfo.outputPath("distance-rings-mobile.png"),
    fullPage: true,
  });
  const stageWatch = await page.evaluate(
    () => [...(Reflect.get(window, "activeLocationWatches") as Set<number>)][0],
  );
  await page.getByRole("button", { name: /Next stage/ }).click();
  await expect(page.locator(".s590-field")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "clearedLocationWatches") as number[],
      ),
    )
    .toContain(stageWatch);
});

test("native denial stays unmeasured and opens no boxes", async ({
  page,
  context,
}) => {
  await context.grantPermissions([]);
  await page.goto("/?locale=en&stage=S-590");
  await expect(page.getByRole("status")).toHaveText("Denied");
  await expect(page.locator(".s590-distance")).toHaveAttribute(
    "data-observed",
    "false",
  );
  await expect(page.locator(".s590-indicator")).not.toBeVisible();
  for (const box of await page.locator(".s590-box .gift-box").all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
});

test("native measurement continues with an in-memory anchor when session storage is blocked", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 0, longitude: 0, accuracy: 1 });
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    const remove = Storage.prototype.removeItem;
    const deny = (key: string) => {
      if (key === "busycube:S-590:anchor")
        throw new DOMException("Fixture: storage disabled", "SecurityError");
    };
    Storage.prototype.getItem = function (key) {
      deny(key);
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      deny(key);
      set.call(this, key, value);
    };
    Storage.prototype.removeItem = function (key) {
      deny(key);
      remove.call(this, key);
    };
  });
  await page.goto("/?locale=en&stage=S-590");
  await expect(page.locator(".s590-indicator")).toHaveAttribute("cx", "300");
  await context.setGeolocation({
    latitude: ((102.1 / 6371000) * 180) / Math.PI,
    longitude: 0,
    accuracy: 1,
  });
  for (const box of await page.locator(".s590-box .gift-box").all())
    await expect(box).toHaveAttribute("data-box-state", "open");
  await expect(page.getByRole("status")).toHaveText("Active");
});
