import { webcrypto } from "node:crypto";
import { expect, type Page, test, type Worker } from "@playwright/test";

type NotificationData = {
  kind: string;
  stage: string;
  nonce: string;
  step: number;
};
async function fixture(page: Page) {
  await page.context().grantPermissions(["notifications"]);
  await page.goto("/?locale=en&stage=S-420&vault-attempt=RLLR");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const worker = page
    .context()
    .serviceWorkers()
    .find((item) => item.url().includes("/service-worker.js"));
  if (!worker) throw new Error("Missing game worker");
  await worker.evaluate(() => {
    Reflect.set(globalThis, "vaultFixtureShown", []);
    const registration = Reflect.get(
      globalThis,
      "registration",
    ) as ServiceWorkerRegistration;
    registration.showNotification = async (title, options) => {
      Reflect.get(globalThis, "vaultFixtureShown").push({ title, options });
    };
  });
  return worker;
}
async function data(worker: Worker): Promise<NotificationData> {
  return worker.evaluate(
    () => Reflect.get(globalThis, "vaultFixtureShown").at(-1).options.data,
  );
}
async function action(worker: Worker, value: string, old?: NotificationData) {
  await worker.evaluate(
    async ({ value, old }) => {
      const last =
        old ?? Reflect.get(globalThis, "vaultFixtureShown").at(-1).options.data;
      const run = Reflect.get(globalThis, "queueVault") as (
        task: () => Promise<void>,
      ) => Promise<void>;
      const click = Reflect.get(globalThis, "vaultNotificationClick") as (
        data: unknown,
        action: string,
      ) => Promise<void>;
      try {
        await run(() => click(last, value));
      } catch (error) {
        // Direct fixture calls have no native notification interaction grant for focus().
        if (
          !(error instanceof DOMException) ||
          error.name !== "InvalidAccessError"
        )
          throw error;
      }
    },
    { value, old },
  );
}
async function record(page: Page): Promise<{
  nonce: string;
  input: string;
  installationId: string;
  phase: string;
  credited: boolean;
}> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-notification-vault-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction("attempts");
      const read = tx.objectStore("attempts").get("current");
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
      tx.oncomplete = () => db.close();
    });
  });
}
async function target(id: string) {
  const digest = new Uint8Array(
    await webcrypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`busycube:notification-vault:S-420:1\0${id}`),
    ),
  );
  return Array.from({ length: 5 }, (_, i) =>
    (digest[0] ?? 0) & (1 << i) ? "R" : "L",
  ).join("");
}
const begin = (page: Page) =>
  page.getByRole("button", { name: /^Padlock:/ }).click();
const box = (page: Page) => page.locator(".problem-gift .gift-box");
async function enter(page: Page, worker: Worker, input: string) {
  for (let index = 0; index < input.length; index++) {
    await action(worker, input[index] === "L" ? "left" : "right");
    await expect(page.locator(".s420-entry")).toHaveCount(index + 1);
  }
}

test("real worker messaging and IndexedDB keep unlimited input separate from Try and consume a successful receipt once", async ({
  page,
}, info) => {
  const worker = await fixture(page);
  await expect(box(page)).toHaveAttribute("data-box-state", "ribboned");
  expect(new URL(page.url()).searchParams.has("vault-attempt")).toBe(false);
  expect(
    await worker.evaluate(
      () => Reflect.get(globalThis, "vaultFixtureShown").length,
    ),
  ).toBe(0);
  await begin(page);
  await expect(page.locator(".puzzle [role=status]")).toHaveText("Active");
  const first = await record(page);
  const savedId = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open("busycube-progress-v1", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("documents");
          const read = tx.objectStore("documents").get("current");
          read.onsuccess = () => resolve(read.result.installationId);
          read.onerror = () => reject(read.error);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  expect(first.installationId).toBe(savedId);
  const answer = await target(first.installationId);
  const firstData = await data(worker);
  expect(Object.keys(firstData).sort()).toEqual([
    "kind",
    "nonce",
    "stage",
    "step",
  ]);
  await worker.evaluate((payload) => {
    const event = new Event("notificationclick");
    Object.defineProperties(event, {
      notification: { value: { data: payload, close() {} } },
      action: { value: "left" },
      waitUntil: {
        value: () => {
          throw new Error("Synthetic click was accepted");
        },
      },
    });
    globalThis.dispatchEvent(event);
  }, firstData);
  expect((await record(page)).input).toBe("");
  await enter(page, worker, `${answer}LR`);
  await expect(page.locator(".s420-verdict")).toHaveCount(0);
  await expect(box(page)).toHaveAttribute("data-box-state", "ribboned");
  await action(worker, "");
  await expect(page.locator(".s420-verdict")).toHaveCount(7);
  await expect(box(page)).toHaveAttribute("data-box-state", "ribboned");
  expect(await page.locator(".s420-verdict").allTextContents()).toEqual([
    "✓",
    "✓",
    "✓",
    "✓",
    "✓",
    "×",
    "×",
  ]);
  await page.screenshot({
    path: info.outputPath("vault-long-result.png"),
    fullPage: true,
  });
  await begin(page);
  await expect(page.locator(".s420-entry")).toHaveCount(0);
  await expect(page.locator(".s420-verdict")).toHaveCount(0);
  const second = await record(page);
  expect(second.nonce).not.toBe(first.nonce);
  expect(second.installationId).toBe(first.installationId);
  await action(worker, "left", firstData);
  expect((await record(page)).input).toBe("");
  await enter(page, worker, answer);
  await expect(box(page)).toHaveAttribute("data-box-state", "ribboned");
  await action(worker, "");
  await expect(box(page)).toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".s420-verdict")).toHaveCount(5);
  const submitted = await record(page);
  expect(submitted.credited).toBe(true);
  expect(Object.keys(submitted)).not.toContain("target");
  expect(Object.keys(submitted)).not.toContain("hashes");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("vault-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(`/?locale=en&stage=S-420&vault-receipt=${submitted.nonce}`);
  await expect(box(page)).toHaveAttribute("data-box-state", "closed");
  await expect(page.locator(".s420-verdict")).toHaveCount(5);
});

test("the last-started browser tab owns input and only that owner is navigated by Try", async ({
  page,
  context,
}) => {
  const worker = await fixture(page);
  await begin(page);
  await expect(page.locator(".puzzle [role=status]")).toHaveText("Active");
  const old = await data(worker);
  await page.evaluate(() => Reflect.set(window, "ownerGuard", "first"));
  const other = await context.newPage();
  await other.goto("/?locale=en&stage=S-420");
  await begin(other);
  await expect(other.locator(".puzzle [role=status]")).toHaveText("Active");
  await action(worker, "right", old);
  expect((await record(other)).input).toBe("");
  await action(worker, "left");
  await expect(other.locator(".s420-entry")).toHaveCount(1);
  await expect(page.locator(".s420-entry")).toHaveCount(0);
  await action(worker, "");
  await expect(other.locator(".s420-verdict")).toHaveCount(1);
  await expect(box(other)).toHaveAttribute("data-box-state", "ribboned");
  expect(await page.evaluate(() => Reflect.get(window, "ownerGuard"))).toBe(
    "first",
  );
});

test("failed notification display stays unachieved and cannot accept actions", async ({
  page,
}) => {
  const worker = await fixture(page);
  await worker.evaluate(() => {
    const registration = Reflect.get(
      globalThis,
      "registration",
    ) as ServiceWorkerRegistration;
    registration.showNotification = async () => {
      throw new Error("Controlled unavailable display");
    };
  });
  await begin(page);
  await expect(page.locator(".puzzle [role=status]")).toHaveText("Error");
  const failed = await record(page);
  expect(failed.phase).toBe("error");
  await action(worker, "", {
    kind: "busycube-vault-v1",
    stage: "S-420",
    nonce: failed.nonce,
    step: 0,
  });
  await expect(box(page)).toHaveAttribute("data-box-state", "ribboned");
  await expect(page.locator(".s420-verdict")).toHaveCount(0);
});
