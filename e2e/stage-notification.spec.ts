import { expect, test } from "@playwright/test";

test("rejects URL-only and pending arrivals, observes native notification availability and consumes a receipt fixture once", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["notifications"]);
  await page.goto("/?locale=en&stage=S-090&notification=1");
  const open = page.locator('.stage-view .gift-box[data-box-state="open"]');
  await expect(page.getByRole("button", { name: /Bell:/ })).toBeVisible();
  await expect(open).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("notification")).toBe(false);
  await page.getByRole("button", { name: /Bell:/ }).click();
  await expect(page.locator(".puzzle [role=status]")).toHaveText(
    /^(Granted|Error)$/,
    {
      timeout: 20_000,
    },
  );
  const notifications = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return (
      await registration.getNotifications({ tag: "busycube-stage-S-090" })
    ).map((notification) => ({
      stage: notification.data?.stage,
      nonce: notification.data?.nonce,
      body: notification.body,
    }));
  });
  const nativeObservation = await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    if (
      !databases.some(
        (database) => database.name === "busycube-notification-receipts",
      )
    )
      return {
        pendingState: "missing-database",
        permission: Notification.permission,
      };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-notification-receipts", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const pendingState = await new Promise<string>((resolve, reject) => {
      const transaction = database.transaction("attempts");
      const request = transaction.objectStore("attempts").get("S-090");
      request.onsuccess = () =>
        resolve(request.result?.state ?? "missing-record");
      request.onerror = () => reject(request.error);
    });
    database.close();
    return { pendingState, permission: Notification.permission };
  });
  console.log(
    "Native notification observation",
    nativeObservation,
    notifications.length,
  );
  await testInfo.attach("native-notification-observation", {
    body: JSON.stringify({
      ...nativeObservation,
      notificationCount: notifications.length,
      status: await page.locator(".puzzle [role=status]").textContent(),
    }),
    contentType: "application/json",
  });
  if (notifications.length) expect(notifications[0]?.stage).toBe("S-090");
  else await expect(page.locator(".puzzle [role=status]")).toHaveText("Error");
  const nonce: string =
    notifications[0]?.nonce ?? (await page.evaluate(() => crypto.randomUUID()));
  expect(nonce).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(open).toHaveCount(0);
  await page.evaluate(async (value) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-notification-receipts", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("attempts"))
          request.result.createObjectStore("attempts");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("attempts", "readwrite");
      transaction
        .objectStore("attempts")
        .put({ nonce: value, state: "pending" }, "S-090");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, nonce);
  await page.goto(`/?locale=en&stage=S-090&notification-receipt=${nonce}`);
  await expect(page.locator(".puzzle [role=status]")).toHaveText("Invalid");
  await expect(open).toHaveCount(0);
  // Controlled receipt fixture tests the IndexedDB/arrival boundary; it is not an OS notification click.
  await page.evaluate(async (value) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-notification-receipts", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("attempts", "readwrite");
      transaction
        .objectStore("attempts")
        .put({ nonce: value, state: "clicked" }, "S-090");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, nonce);
  await page.goto(`/?locale=en&stage=S-090&notification-receipt=${nonce}`);
  await expect(open).toHaveCount(1);
  expect(new URL(page.url()).searchParams.has("notification-receipt")).toBe(
    false,
  );
  await page.goto(`/?locale=en&stage=S-090&notification-receipt=${nonce}`);
  await expect(page.locator(".puzzle [role=status]")).toHaveText("Invalid");
  await expect(open).toHaveCount(0);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    for (const notification of await registration.getNotifications({
      tag: "busycube-stage-S-090",
    }))
      notification.close();
  });
});
