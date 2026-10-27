import { expect, test } from "@playwright/test";
import type { ProgressDocument } from "../src/domain/progress";

const removed = [
  "S-210",
  "S-250",
  "S-310",
  "S-390",
  "S-410",
  "S-460",
  "S-490",
  "S-520",
  "S-540",
  "S-570",
];
test("removed stages stay out of the catalogue while persisted legacy progress survives new solves and reload", async ({
  page,
}) => {
  await page.goto("/privacy/index.html");
  await page.evaluate(async (ids) => {
    const document: ProgressDocument = {
      schemaVersion: 1,
      installationId: "removed-stage-fixture",
      settings: { locale: "en" },
      stages: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            solvedBoxIds:
              id === "S-310"
                ? ["B01", "B02", "B03"]
                : id === "S-250" || id === "S-390" || id === "S-540"
                  ? ["B01", "B02"]
                  : ["B01"],
            markers: ["legacy"],
          },
        ]),
      ),
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("busycube-progress-v1", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("documents"))
          request.result.createObjectStore("documents");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("documents", "readwrite");
        tx.objectStore("documents").put(document, "current");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }, removed);
  await page.goto("/?locale=en");
  await expect(page.locator(".stage-card").first()).toBeVisible();
  for (const id of removed)
    await expect(page.locator(`[data-stage-id="${id}"]`)).toHaveCount(0);
  await page.goto("/?locale=en&stage=S-000");
  await page.locator(".problem-gift .gift-box__control").click();
  await expect(page.locator(".problem-gift .gift-box")).toHaveAttribute(
    "data-box-state",
    "open",
  );
  async function readProgress() {
    return page.evaluate(
      () =>
        new Promise<ProgressDocument>((resolve, reject) => {
          const request = indexedDB.open("busycube-progress-v1", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("documents");
            const read = tx.objectStore("documents").get("current");
            read.onsuccess = () => resolve(read.result);
            tx.oncomplete = () => db.close();
          };
        }),
    );
  }
  await expect
    .poll(async () => (await readProgress()).stages["S-000"]?.solvedBoxIds)
    .toContain("B01");
  await page.reload();
  const progress = await readProgress();
  expect(progress.stages["S-000"]?.solvedBoxIds).toContain("B01");
  await expect(page.locator(".problem-gift .gift-box")).toHaveAttribute(
    "data-box-state",
    "closed",
  );
  for (const id of removed)
    expect(progress.stages[id]).toEqual({
      solvedBoxIds:
        id === "S-310"
          ? ["B01", "B02", "B03"]
          : id === "S-250" || id === "S-390" || id === "S-540"
            ? ["B01", "B02"]
            : ["B01"],
      markers: ["legacy"],
    });
  await page.goto("/?locale=en&stage=S-080");
  await expect(
    page.locator('.problem-gift .gift-box[data-box-state="ribboned"]'),
  ).toHaveCount(6);
});
