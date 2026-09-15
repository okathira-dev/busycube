import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("navigates with history and exposes meaningful metadata", async ({
  page,
}) => {
  await page.goto("/?locale=en");
  await expect(page.getByRole("heading", { name: "Busycube" })).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/view=settings/);
  await expect(page).toHaveTitle("Settings | Busycube: Web API Explorer");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeFocused();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Box room" })).toBeVisible();
});

test("restores progress from IndexedDB after reload", async ({ page }) => {
  await page.goto("/?locale=en");
  await expect(page.getByText(/Opened boxes:/)).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("busycube-progress-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("documents", "readwrite");
      transaction.objectStore("documents").put(
        {
          schemaVersion: 1,
          installationId: "e2e-installation",
          stages: { "S-000": { solvedBoxIds: ["B01"] } },
          settings: { locale: "en" },
        },
        "current",
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(page.getByText("Opened boxes: 1 / 204")).toBeVisible();
});

test("has no serious or critical automated accessibility violations", async ({
  page,
}) => {
  await page.goto("/?locale=en");
  await expect(page.getByRole("heading", { name: "Box room" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});
