import { expect, test } from "@playwright/test";

test("saved page works offline and its real box click reaches game progress; controlled deletion remains separate from empty index/cache", async ({
  page,
  context,
}, info) => {
  await context.addInitScript(() => {
    const available = "index" in ServiceWorkerRegistration.prototype;
    Reflect.set(window, "nativeContentIndexAvailable", available);
    if (!available)
      Object.defineProperty(ServiceWorkerRegistration.prototype, "index", {
        configurable: true,
        value: undefined,
      });
  });
  await page.goto("/?locale=en&stage=S-970");
  const gifts = page.locator(".s970-stage .gift-box");
  await expect(gifts).toHaveCount(2);
  expect(await page.locator(".s970-stage a").count()).toBe(0);
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(page.locator(".s970-stage [role=status]")).not.toHaveText(
    "Waiting",
  );
  const worker = context
    .serviceWorkers()
    .find((worker) => worker.url().endsWith("/content-index/content-sw.js"));
  if (!worker) throw new Error("Missing content worker");
  const native = await worker.evaluate(() => ({
    available: !!Reflect.get(Reflect.get(globalThis, "registration"), "index"),
  }));
  const nativeSaved =
    (await page.getByRole("status").textContent()) === "Created";
  await info.attach("native-index.json", {
    contentType: "application/json",
    body: JSON.stringify({ ...native, saved: nativeSaved }),
  });
  if (!nativeSaved) {
    await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
    // Desktop lacks the browser list/provider. Control only that registration
    // backend; native Worker/Cache/WindowClient/MessagePort stay unchanged.
    await worker.evaluate(() => {
      const entries = new Map<string, { id: string; url: string }>();
      Object.defineProperty(Reflect.get(globalThis, "registration"), "index", {
        configurable: true,
        value: {
          add: async (description: { id: string; url: string }) => {
            if (!description.url) throw new Error("Missing real API url field");
            entries.set(description.id, description);
          },
          getAll: async () => [...entries.values()],
          delete: async (id: string) => {
            entries.delete(id);
          },
        },
      });
    });
    await page.getByRole("button", { name: "Save page", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Created");
  }
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
  const entry = await worker.evaluate(async () => {
    const manager = Reflect.get(
      Reflect.get(globalThis, "registration"),
      "index",
    );
    const entries: { id: string; url: string }[] = await manager.getAll();
    return entries.find((entry) => entry.id.startsWith("busycube-s970-"));
  });
  if (!entry) throw new Error("No registered game page");
  expect(entry.url).toContain("/content-index/saved.html?entry=");
  await page.screenshot({ path: info.outputPath("content-main.png") });
  await context.setOffline(true);
  const saved = await context.newPage();
  await saved.goto(entry.url);
  const gift = saved.getByRole("button", { name: "Box", exact: true });
  await expect(gift).toHaveAttribute("data-state", "ribboned");
  await gift.evaluate((button: HTMLButtonElement) => button.click());
  await expect(gift).toHaveAttribute("data-state", "ribboned");
  await gift.click();
  await expect(gift).toHaveAttribute("data-state", "open");
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "open");
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
  await saved.screenshot({
    path: info.outputPath("content-saved-offline.png"),
  });
  await saved.close();
  await context.setOffline(false);
  await worker.evaluate(
    async (id) =>
      Reflect.get(Reflect.get(globalThis, "registration"), "index").delete(id),
    entry.id,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
  await worker.evaluate((id) => {
    const event = new Event("contentdelete");
    Object.defineProperty(event, "id", { value: id });
    globalThis.dispatchEvent(event);
  }, entry.id);
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
  // A controlled delivery into the worker's internal effect tests the product
  // integration. The production listener's trusted-event guard stays intact.
  await worker.evaluate(
    async (id) =>
      Reflect.get(
        globalThis,
        "serial",
      )(() => Reflect.get(globalThis, "removeContent")(id)),
    entry.id,
  );
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).includes("busycube-s970-content-v1"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).includes("busycube-s970-state-v1"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Created");
  const current = await page.evaluate(async () =>
    (
      await (
        await caches.open("busycube-s970-state-v1")
      ).match(`${location.origin}/content-index/state.json`)
    )?.json(),
  );
  expect(current.id).not.toBe(entry.id);
  expect(current.openId).toBe(entry.id);
  expect(current.deleteId).toBe(entry.id);
  const old = await context.newPage();
  await old.goto(entry.url);
  await old.getByRole("button", { name: "Box", exact: true }).click();
  await expect(old.getByRole("status")).toHaveText("Unavailable", {
    timeout: 15000,
  });
  await old.close();
  await page.reload();
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "closed");
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "closed");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("content-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("the unmodified browser capability stays unavailable without inventing Content Index progress", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-970");
  const gifts = page.locator(".s970-stage .gift-box");
  await expect(gifts).toHaveCount(2);
  const available = await page.evaluate(
    () => "index" in ServiceWorkerRegistration.prototype,
  );
  if (!available)
    await expect(page.locator(".capability-overlay")).toBeVisible();
  else {
    await page.getByRole("button", { name: "Save page", exact: true }).click();
    await expect(page.locator(".s970-stage [role=status]")).not.toHaveText(
      "Waiting",
    );
  }
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "ribboned");
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "ribboned");
});
