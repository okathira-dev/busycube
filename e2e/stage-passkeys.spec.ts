import { expect, type Page, test } from "@playwright/test";

async function virtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable", { enableUI: false });
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        ctap2Version: "ctap2_1",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  await page.addInitScript(() => {
    const create = navigator.credentials.create.bind(navigator.credentials);
    const get = navigator.credentials.get.bind(navigator.credentials);
    const records: {
      mode: string;
      signal?: AbortSignal;
      result?: string;
      error?: string;
      allow: number | undefined;
    }[] = [];
    Reflect.set(window, "passkeyNativeRecords", records);
    navigator.credentials.create = async (options) => {
      const record = {
        mode: "create",
        signal: options?.signal,
        allow: undefined,
        result: "",
        error: "",
      };
      records.push(record);
      try {
        const result = await create(options);
        record.result = result?.type ?? "null";
        return result;
      } catch (error) {
        record.error = error instanceof DOMException ? error.name : "Error";
        throw error;
      }
    };
    navigator.credentials.get = async (options) => {
      const record = {
        mode: options?.mediation ?? "optional",
        signal: options?.signal,
        allow: options?.publicKey?.allowCredentials?.length,
        result: "",
        error: "",
      };
      records.push(record);
      try {
        const result = await get(options);
        record.result = result?.type ?? "null";
        return result;
      } catch (error) {
        record.error = error instanceof DOMException ? error.name : "Error";
        throw error;
      }
    };
  });
  return { cdp, authenticatorId };
}
const open = (page: Page) =>
  page.goto("http://localhost:4173/?locale=en&stage=S-380");
const boxes = (page: Page) => page.locator(".problem-gift .gift-box");

test("native WebAuthn creates a resident passkey and uses conditional mediation independently", async ({
  page,
}, info) => {
  const { cdp, authenticatorId } = await virtualAuthenticator(page);
  await open(page);
  await expect(boxes(page)).toHaveCount(3);
  expect(
    await page.evaluate(
      () => Reflect.get(window, "passkeyNativeRecords").length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: /^Key with plus:/ }).click();
  await expect(boxes(page).nth(0)).toHaveAttribute("data-box-state", "open");
  const created = await cdp.send("WebAuthn.getCredentials", {
    authenticatorId,
  });
  expect(created.credentials).toHaveLength(1);
  expect(created.credentials[0]?.isResidentCredential).toBe(true);
  expect(created.credentials[0]?.rpId).toBe("localhost");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("busycube:S-380:credential-id"),
    ),
  ).toBeNull();
  await page.getByRole("button", { name: /^Open padlock:/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Passkey account" }),
  ).toBeFocused();
  await expect(boxes(page).nth(1)).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(() =>
      Reflect.get(window, "passkeyNativeRecords").map(
        (r: { mode: string; result: string; allow?: number }) => ({
          mode: r.mode,
          result: r.result,
          allow: r.allow,
        }),
      ),
    ),
  ).toEqual([
    { mode: "create", result: "public-key", allow: undefined },
    { mode: "conditional", result: "public-key", allow: 0 },
  ]);
  await expect(boxes(page).nth(2)).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await page.screenshot({
    path: info.outputPath("passkeys.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("passkeys-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("native pending authentication is aborted on departure without opening refusal", async ({
  page,
}) => {
  const { cdp, authenticatorId } = await virtualAuthenticator(page);
  await open(page);
  await cdp.send("WebAuthn.setAutomaticPresenceSimulation", {
    authenticatorId,
    enabled: false,
  });
  await page.getByRole("button", { name: /^Key with slash:/ }).click();
  await expect(page.locator(".s380-puzzle")).toHaveAttribute(
    "data-pending",
    "refusal",
  );
  await expect(boxes(page).nth(2)).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Reflect.get(window, "passkeyNativeRecords").every(
          (r: { signal?: AbortSignal }) => r.signal?.aborted,
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "passkeyNativeRecords")[0].error),
    )
    .toBe("AbortError");
});

test("controlled valid-request refusal opens only the new refusal box and preserves the old failure history", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.credentials.get = async () => {
      throw new DOMException(
        "Controlled authentication failure",
        "NotAllowedError",
      );
    };
  });
  await page.goto("http://localhost:4173/privacy/index.html");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("busycube-progress-v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("documents");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("documents", "readwrite");
        tx.objectStore("documents").put(
          {
            schemaVersion: 1,
            installationId: "passkey-fixture",
            stages: { "S-380": { solvedBoxIds: ["B03"] } },
            settings: { locale: "en" },
          },
          "current",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await open(page);
  await expect(boxes(page).nth(2)).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await page.getByRole("button", { name: /^Key with slash:/ }).click();
  await expect(boxes(page).nth(2)).toHaveAttribute("data-box-state", "open");
  await expect(boxes(page).nth(0)).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await expect(boxes(page).nth(1)).toHaveAttribute(
    "data-box-state",
    "ribboned",
  );
  await expect(page.locator(".s380-puzzle [role=status]")).toHaveText("Denied");
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          new Promise<string[]>((resolve) => {
            const request = indexedDB.open("busycube-progress-v1", 1);
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction("documents");
              const read = tx.objectStore("documents").get("current");
              read.onsuccess = () =>
                resolve(read.result.stages["S-380"].solvedBoxIds);
              tx.oncomplete = () => db.close();
            };
          }),
      ),
    )
    .toEqual(["B03", "B04"]);
});
