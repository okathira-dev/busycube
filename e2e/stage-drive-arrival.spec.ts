import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import type { ProgressDocument } from "../src/domain/progress";

type Replica = { id: string; name: string; document: unknown; version: number };
function driveBackend() {
  const replicas: Replica[] = [];
  const calls: string[] = [];
  let failure = false;
  async function connect(context: BrowserContext) {
    await context.addInitScript(() => {
      const calls: string[] = [];
      Reflect.set(window, "identityFixtureCalls", calls);
      window.google = {
        accounts: {
          oauth2: {
            initTokenClient(config) {
              return {
                requestAccessToken() {
                  calls.push(config.scope);
                  config.callback({ access_token: "s140-fixture-token" });
                },
              };
            },
            revoke(_token, callback) {
              callback();
            },
          },
        },
      };
    });
    await context.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    await context.route("https://www.googleapis.com/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization,Content-Type,If-Match",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
        "Content-Type": "application/json",
      };
      if (method === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      calls.push(`${method} ${url.pathname}`);
      expect(request.headers().authorization).toBe("Bearer s140-fixture-token");
      if (failure) {
        await route.fulfill({ status: 503, headers, body: "{}" });
        return;
      }
      if (url.pathname === "/drive/v3/files" && method === "GET") {
        expect(url.searchParams.get("spaces")).toBe("appDataFolder");
        await route.fulfill({
          headers,
          body: JSON.stringify({
            files: replicas.map((r) => ({ id: r.id, name: r.name })),
          }),
        });
        return;
      }
      if (url.pathname === "/drive/v3/files" && method === "POST") {
        const metadata = request.postDataJSON();
        expect(metadata.parents).toEqual(["appDataFolder"]);
        const replica: Replica = {
          id: `replica-${replicas.length}`,
          name: metadata.name,
          document: null,
          version: 0,
        };
        replicas.push(replica);
        await route.fulfill({
          headers,
          body: JSON.stringify({ id: replica.id, name: replica.name }),
        });
        return;
      }
      const replica = replicas.find((r) => url.pathname.endsWith(`/${r.id}`));
      if (replica && method === "GET") {
        expect(url.searchParams.get("alt")).toBe("media");
        await route.fulfill({
          headers: { ...headers, etag: `"${replica.version}"` },
          body: JSON.stringify(replica.document),
        });
        return;
      }
      if (replica && method === "PATCH") {
        expect(url.pathname.startsWith("/upload/drive/v3/files/")).toBe(true);
        replica.document = request.postDataJSON();
        replica.version++;
        await route.fulfill({ headers, body: "{}" });
        return;
      }
      await route.abort();
      throw new Error("Unexpected Drive fixture operation");
    });
  }
  return {
    connect,
    replicas,
    calls,
    fail: (value: boolean) => {
      failure = value;
    },
  };
}
async function seed(page: Page, id: string, legacy = false) {
  await page.goto("/privacy/index.html");
  await page.evaluate(
    async ({ id, legacy }) => {
      const value: ProgressDocument = {
        schemaVersion: 1,
        installationId: id,
        stages: legacy
          ? {
              "S-140": { solvedBoxIds: ["B01", "B02"] },
              "S-000": { solvedBoxIds: ["B01"] },
            }
          : { "S-020": { solvedBoxIds: ["B01"] } },
        settings: { locale: "en" },
      };
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("busycube-progress-v1", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("documents");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("documents", "readwrite");
          tx.objectStore("documents").put(value, "current");
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
    },
    { id, legacy },
  );
  await page.goto("/?locale=en&stage=S-140");
  await expect(page.locator(".problem-gift")).toHaveCount(1);
}
async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<ProgressDocument>((resolve, reject) => {
        const request = indexedDB.open("busycube-progress-v1", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("documents");
          const value = tx.objectStore("documents").get("current");
          value.onsuccess = () => resolve(value.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}

test("two independent browser stores exchange real product sync requests through a controlled Drive endpoint", async ({
  page,
  context,
  browser,
}, info) => {
  const drive = driveBackend();
  await drive.connect(context);
  await seed(page, "installation-one", true);
  test.skip(
    (await page
      .getByRole("status")
      .filter({ hasText: "Google Drive is not configured" })
      .count()) > 0,
    "Build has no configured Google client ID; stage/service unit coverage remains active.",
  );
  const gift = page.locator(".problem-gift .gift-box");
  await expect(gift).toHaveAttribute("data-box-state", "closed");
  expect(drive.calls).toHaveLength(0);
  await page.getByRole("button", { name: /^Two overlapping frames:/ }).click();
  await expect(page.locator(".s140-puzzle")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(gift).toHaveAttribute("data-box-state", "closed");
  await expect(page.locator(".s140-link__arrival")).toBeHidden();
  expect(drive.replicas).toHaveLength(1);
  expect(drive.replicas[0]?.document).toMatchObject({
    installationId: "installation-one",
  });
  const second = await browser.newContext();
  try {
    await drive.connect(second);
    const other = await second.newPage();
    await seed(other, "installation-two");
    await other
      .getByRole("button", { name: /^Two overlapping frames:/ })
      .click();
    await expect(other.locator(".problem-gift .gift-box")).toHaveAttribute(
      "data-box-state",
      "open",
    );
    expect((await stored(other)).installationId).toBe("installation-two");
    await page
      .getByRole("button", { name: /^Two overlapping frames:/ })
      .click();
    await expect(gift).toHaveAttribute("data-box-state", "open");
    await expect(page.locator(".s140-link__arrival")).toBeVisible();
    await expect
      .poll(async () => (await stored(page)).stages["S-020"]?.solvedBoxIds)
      .toContain("B01");
    const value = await stored(page);
    expect(value.installationId).toBe("installation-one");
    expect(value.stages["S-140"]?.solvedBoxIds).toEqual(["B01", "B02"]);
    expect(value.stages["S-000"]?.solvedBoxIds).toEqual(["B01"]);
    expect(value.settings.locale).toBe("en");
    for (const doc of drive.replicas)
      expect((doc.document as ProgressDocument).installationId).toBe(
        doc.name.includes("installation-one")
          ? "installation-one"
          : "installation-two",
      );
    expect(await page.locator(".s140-puzzle").innerText()).not.toContain(
      "installation-",
    );
    await page.screenshot({
      path: info.outputPath("drive-arrival.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: info.outputPath("drive-arrival-mobile.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const before = drive.calls.length;
    await page.reload();
    await expect(gift).toHaveAttribute("data-box-state", "closed");
    await expect(page.locator(".s140-link__arrival")).toBeHidden();
    expect(drive.calls).toHaveLength(before);
  } finally {
    await second.close();
  }
});

test("network failure and a replica without identity never open a box or upload a replacement", async ({
  page,
  context,
}) => {
  const drive = driveBackend();
  await drive.connect(context);
  await seed(page, "installation-one");
  test.skip(
    (await page
      .getByRole("status")
      .filter({ hasText: "Google Drive is not configured" })
      .count()) > 0,
    "Build has no configured Google client ID.",
  );
  drive.fail(true);
  await page.getByRole("button", { name: /^Two overlapping frames:/ }).click();
  await expect(page.locator(".s140-puzzle [role=status]")).toHaveText("Error");
  drive.fail(false);
  drive.replicas.push({
    id: "corrupt",
    name: "busycube-progress-corrupt.json",
    document: {
      schemaVersion: 1,
      installationId: "  ",
      stages: {},
      settings: { locale: "en" },
    },
    version: 0,
  });
  await page.getByRole("button", { name: /^Two overlapping frames:/ }).click();
  await expect
    .poll(() => drive.calls.filter((call) => call.includes("/corrupt")).length)
    .toBe(1);
  await expect(page.locator(".s140-puzzle [role=status]")).toHaveText("Error");
  await expect(page.locator(".problem-gift .gift-box")).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  expect(
    drive.calls.some(
      (call) => call.startsWith("PATCH") || call.startsWith("POST"),
    ),
  ).toBe(false);
  expect((await stored(page)).installationId).toBe("installation-one");
  expect((await stored(page)).stages["S-020"]?.solvedBoxIds).toEqual(["B01"]);
});
