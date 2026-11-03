import { expect, test } from "@playwright/test";

test("keeps clears from two tabs when the stale tab changes language", async ({
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, "BroadcastChannel", { value: undefined });
  });
  const a = await context.newPage(),
    b = await context.newPage();
  await a.goto("/?locale=en&stage=S-000");
  await b.goto("/?locale=en&stage=S-010");
  await expect(
    a.getByRole("button", { name: /^Pointing hand:/ }),
  ).toBeVisible();
  await expect(b.getByRole("button", { name: /^Mouse:/ })).toBeVisible();
  await a.getByRole("button", { name: /^Pointing hand:/ }).click();
  await b.getByRole("button", { name: /^Mouse:/ }).click();
  await b.getByRole("combobox", { name: "Language", exact: true }).click();
  await b.getByRole("option", { name: "日本語", exact: true }).click();
  await expect
    .poll(() =>
      b.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("busycube-player-v2", 1);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        try {
          return await new Promise((resolve, reject) => {
            const r = db
              .transaction("state")
              .objectStore("state")
              .get("current");
            r.onsuccess = () =>
              resolve({
                stages: r.result.stages,
                locale: r.result.settings.locale,
              });
            r.onerror = () => reject(r.error);
          });
        } finally {
          db.close();
        }
      }),
    )
    .toEqual({
      stages: {
        "S-000": { solvedBoxIds: ["B01"] },
        "S-010": { solvedBoxIds: ["B01"] },
      },
      locale: "ja",
    });
  await a.reload();
  await expect(a.locator(".stage-state")).toHaveText("1/1");
});

test("reopens IndexedDB after an initial open failure", async ({ page }) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    let failed = sessionStorage.getItem("test-open-failed") === "1";
    indexedDB.open = (...args: Parameters<IDBFactory["open"]>) => {
      if (args[0] === "busycube-player-v2" && !failed) {
        failed = true;
        sessionStorage.setItem("test-open-failed", "1");
        throw new DOMException("Temporary failure", "UnknownError");
      }
      return open(...args);
    };
  });
  await page.goto("/?locale=en&stage=S-000");
  await page
    .getByRole("button", { name: "Retry storage", exact: true })
    .click();
  await page.getByRole("button", { name: /^Pointing hand:/ }).click();
  await expect(page.locator(".stage-state")).toHaveText("1/1");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("busycube-player-v2");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        try {
          return await new Promise((resolve, reject) => {
            const r = db
              .transaction("state")
              .objectStore("state")
              .get("current");
            r.onsuccess = () => resolve(r.result.stages["S-000"]?.solvedBoxIds);
            r.onerror = () => reject(r.error);
          });
        } finally {
          db.close();
        }
      }),
    )
    .toEqual(["B01"]);
  await page.reload();
  await expect(page.locator(".stage-state")).toHaveText("1/1");
});
