import { expect, type Page, test } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const tag = "busycube-greenhouse-v2";
async function readPlant(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ nonce: string; phase: string } | null>(
        (resolve, reject) => {
          const request = indexedDB.open("busycube-periodic-stage-v1");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("plants-v2")) {
              db.close();
              resolve(null);
              return;
            }
            const get = db
              .transaction("plants-v2")
              .objectStore("plants-v2")
              .get("plant");
            get.onsuccess = () => {
              db.close();
              resolve(get.result ?? null);
            };
            get.onerror = () => {
              db.close();
              reject(get.error);
            };
          };
        },
      ),
  );
}
test("with controlled registration policy, a native injected periodic event grows once only with all origin windows closed and preserves history on replant", async ({
  page,
  context,
}, info) => {
  // Registration policy is controlled after retaining the real native denial.
  // Event delivery, storage and cached image reads remain native.
  await context.addInitScript(() => {
    if (typeof ServiceWorkerRegistration === "undefined") return;
    const descriptor = Object.getOwnPropertyDescriptor(
      ServiceWorkerRegistration.prototype,
      "periodicSync",
    );
    if (!descriptor?.get) throw new Error("Periodic Sync unavailable");
    const patched = new WeakSet<object>();
    Object.defineProperty(ServiceWorkerRegistration.prototype, "periodicSync", {
      configurable: true,
      get() {
        const manager = descriptor.get?.call(this);
        if (manager && !patched.has(manager)) {
          patched.add(manager);
          const native = manager.register.bind(manager);
          manager.register = async (
            name: string,
            options: { minInterval: number },
          ) => {
            try {
              await native(name, options);
            } catch (error) {
              Reflect.set(window, "nativePeriodicError", {
                name: error instanceof Error ? error.name : String(error),
                message: error instanceof Error ? error.message : "",
              });
              if (
                !(error instanceof DOMException) ||
                !["NotAllowedError", "UnknownError"].includes(error.name) ||
                name !== "busycube-greenhouse-v2"
              )
                throw error;
              Reflect.set(window, "nativePeriodicDenial", error.name);
            }
          };
        }
        return manager;
      },
    });
  });
  const observer = await context.newPage();
  const cdp = await context.newCDPSession(observer);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  await cdp.send("Browser.grantPermissions", {
    origin,
    permissions: ["periodicBackgroundSync"],
    browserContextId: targetInfo.browserContextId,
  });
  let registrationId = "";
  cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
    for (const registration of registrations)
      if (registration.scopeURL === `${origin}/periodic/`)
        registrationId = registration.registrationId;
  });
  await cdp.send("ServiceWorker.enable");
  await page.goto("/privacy/index.html");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("busycube-periodic-stage-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("care", { keyPath: "key" });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("care", "readwrite");
        tx.objectStore("care").put({
          key: "state",
          phase: 2,
          clientlessEvents: 2,
          events: 2,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("busycube-progress-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("documents");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("documents", "readwrite");
        tx.objectStore("documents").put(
          {
            schemaVersion: 1,
            installationId: "greenhouse-fixture",
            stages: { "S-740": { solvedBoxIds: ["B01"] } },
            settings: { locale: "en" },
          },
          "current",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
  await page.goto("/?locale=en&stage=S-740");
  const gift = () => page.locator(".s740-puzzle .gift-box");
  await expect(gift()).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: /^Pot with a sprout:/ }).click();
  await expect
    .poll(async () => ({
      phase: (await readPlant(page))?.phase,
      status: await page.getByRole("status").textContent(),
    }))
    .toEqual({ phase: "armed", status: "Waiting" });
  const first = (await readPlant(page))?.nonce;
  await expect.poll(() => registrationId).not.toBe("");
  const nativeWorker = context
    .serviceWorkers()
    .find((worker) => worker.url().includes("/periodic/periodic-sync-sw.js"));
  if (!nativeWorker) throw new Error("No native greenhouse worker");
  expect(["NotAllowedError", "UnknownError"]).toContain(
    await page.evaluate(() => Reflect.get(window, "nativePeriodicDenial")),
  );
  await nativeWorker.evaluate(() => {
    const manager = Reflect.get(
      Reflect.get(globalThis, "registration"),
      "periodicSync",
    ) as { unregister(tag: string): Promise<void> };
    const native = manager.unregister.bind(manager);
    const calls: string[] = [];
    Reflect.set(globalThis, "greenhouseCleanupCalls", calls);
    manager.unregister = async (value) => {
      calls.push(value);
      await native(value);
    };
  });
  await cdp.send("ServiceWorker.dispatchPeriodicSyncEvent", {
    origin,
    registrationId,
    tag,
  });
  expect((await readPlant(page))?.phase).toBe("armed");
  await expect(gift()).toHaveAttribute("data-box-state", "ribboned");
  await page.screenshot({
    path: info.outputPath("greenhouse-seed.png"),
    fullPage: true,
  });
  await page.close();
  await cdp.send("ServiceWorker.dispatchPeriodicSyncEvent", {
    origin,
    registrationId,
    tag,
  });
  page = await context.newPage();
  await page.goto("/?locale=en&stage=S-740");
  await expect(gift()).toHaveAttribute("data-box-state", "open");
  expect((await readPlant(page))?.nonce).toBe(first);
  expect((await readPlant(page))?.phase).toBe("bloom");
  expect(await page.locator(".s740-plant").getAttribute("src")).toMatch(
    /^blob:/,
  );
  expect(
    await nativeWorker.evaluate(async () => {
      const manager = Reflect.get(
        Reflect.get(globalThis, "registration"),
        "periodicSync",
      ) as { getTags(): Promise<string[]> };
      try {
        return await manager.getTags();
      } catch (error) {
        return error instanceof DOMException ? error.name : String(error);
      }
    }),
  ).toBe("UnknownError");
  await expect(page.getByRole("status")).toHaveText(
    "Retrying background cleanup",
  );
  expect(
    await nativeWorker.evaluate(() =>
      Reflect.get(globalThis, "greenhouseCleanupCalls"),
    ),
  ).toEqual([tag, tag]);
  expect(
    await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).map(
        (r) => new URL(r.scope).pathname,
      ),
    ),
  ).toEqual(expect.arrayContaining(["/", "/periodic/"]));
  await page.screenshot({
    path: info.outputPath("greenhouse-bloom.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Replant the flower", exact: true })
    .click();
  await expect.poll(async () => (await readPlant(page))?.phase).toBe("armed");
  expect((await readPlant(page))?.nonce).not.toBe(first);
  await expect(gift()).toHaveAttribute("data-box-state", "open");
  await page.reload();
  await expect(gift()).toHaveAttribute("data-box-state", "closed");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("greenhouse-mobile.png"),
    fullPage: true,
  });
  const records = await page.evaluate(
    () =>
      new Promise<{ old: unknown; progress: unknown }>((resolve, reject) => {
        const read = (database: string, store: string, key: string) =>
          new Promise<unknown>((done) => {
            const open = indexedDB.open(database);
            open.onsuccess = () => {
              const db = open.result;
              const request = db.transaction(store).objectStore(store).get(key);
              request.onsuccess = () => {
                db.close();
                done(request.result);
              };
            };
          });
        Promise.all([
          read("busycube-periodic-stage-v1", "care", "state"),
          read("busycube-progress-v1", "documents", "current"),
        ]).then(([old, progress]) => resolve({ old, progress }), reject);
      }),
  );
  expect(records.old).toMatchObject({ phase: 2, clientlessEvents: 2 });
  expect(records.progress).toMatchObject({
    stages: { "S-740": { solvedBoxIds: ["B01", "B02"] } },
  });
  await observer.close();
});
