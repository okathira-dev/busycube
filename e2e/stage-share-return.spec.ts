import { expect, test } from "@playwright/test";

test("a share promise and URL cannot solve; an actual matching POST receipt is consumed once", async ({
  page,
  context,
  baseURL,
}) => {
  await page.addInitScript(() => {
    // Controlled outbound fixture: this does not represent an OS share sheet.
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        Reflect.set(window, "outboundShareFixture", data.text);
      },
    });
  });
  await page.goto("/?locale=en&stage=S-240&share-target=1");
  const share = page.getByRole("button", { name: "Share the mark" });
  const box = page.locator(".problem-gift .gift-box");
  await expect(share).toBeEnabled();
  await share.click();
  await expect(page.getByRole("status")).toHaveText("Waiting");
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  const text = await page.evaluate(
    () => Reflect.get(window, "outboundShareFixture") as string,
  );
  expect(text).toMatch(/^busycube:S240:[a-f0-9-]{36}$/);
  await page.reload();
  await expect(share).toBeEnabled();
  await share.click();
  expect(
    await page.evaluate(() => Reflect.get(window, "outboundShareFixture")),
  ).toBe(text);
  const external = await context.newPage();
  await external.goto("/share-target/receive.html");
  await expect(external.getByRole("status")).toContainText("No matching");
  await page.bringToFront();
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  // A real browser form posts through the real Worker route; OS invocation is not claimed.
  async function postMark(body: string) {
    await external.goto("/?locale=en&view=about");
    await external.evaluate(
      ({ body, action }) => {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = action;
        const input = document.createElement("textarea");
        input.name = "text";
        input.value = body;
        form.append(input);
        document.body.append(form);
        form.submit();
      },
      { body, action: new URL("/share-target", baseURL).href },
    );
  }
  await postMark("busycube:S240:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await expect(external.getByRole("status")).toContainText("No matching");
  await postMark(`external note\n${text}\nextra text`);
  await expect(external).toHaveURL(/stage=S-240/);
  await expect(external.locator(".problem-gift .gift-box")).toHaveAttribute(
    "data-box-state",
    "open",
  );
  const receiptCount = await external.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("busycube-share-receipts", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("attempts");
          const count = tx.objectStore("attempts").count();
          count.onsuccess = () => resolve(count.result);
          tx.oncomplete = () => db.close();
        };
        request.onerror = () => reject(request.error);
      }),
  );
  expect(receiptCount).toBe(0);
  await postMark(text);
  await expect(external.getByRole("status")).toContainText("No matching");
});
