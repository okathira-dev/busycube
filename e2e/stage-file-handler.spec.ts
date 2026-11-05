import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

async function observe(page: Page) {
  await page.addInitScript(() => {
    const native = window.launchQueue?.setConsumer.bind(window.launchQueue);
    if (!native) throw new Error("Native LaunchQueue unavailable");
    window.launchQueue?.setConsumer((params) =>
      Reflect.get(window, "fileConsumer")?.(params),
    );
    Object.defineProperty(window, "launchQueue", {
      value: {
        setConsumer: (callback: (params: LaunchParams) => void) => {
          Reflect.set(window, "fileConsumer", callback);
        },
      },
      configurable: true,
    });
  });
}
// Only the incoming queue is controlled. Download bytes and OPFS File handles
// are native; this does not claim an OS association, icon drop or double-click.
async function receive(page: Page, text: string) {
  await page.evaluate(async (contents) => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("key.busycube", { create: true });
    const writer = await handle.createWritable();
    await writer.write(contents);
    await writer.close();
    Reflect.get(
      window,
      "fileConsumer",
    )({ targetURL: `${location.origin}/?stage=S-440`, files: [handle] });
  }, text);
}
const gift = (page: Page) => page.locator(".s440-puzzle .gift-box");

test("box downloads key.busycube, the latest trial survives another window and only matching file receipt clears", async ({
  page,
  context,
}, info) => {
  await observe(page);
  await page.goto("/?locale=en&stage=S-440");
  const downloadKey = async (name: string) => {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: /^File with downward arrow:/ })
      .click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("key.busycube");
    const path = info.outputPath(name);
    await download.saveAs(path);
    return readFile(path, "utf8");
  };
  const first = await downloadKey("first.busycube");
  const second = await downloadKey("second.busycube");
  expect(JSON.parse(first).round).not.toBe(JSON.parse(second).round);
  expect(JSON.parse(second)).toMatchObject({
    kind: "busycube-file-key",
    version: 1,
  });
  await expect(gift(page)).toHaveAttribute("data-box-state", "ribboned");
  await page.screenshot({
    path: info.outputPath("file-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("file-mobile.png"),
    fullPage: true,
  });
  const receiver = await context.newPage();
  await observe(receiver);
  await receiver.goto("/?locale=en&stage=S-440");
  await receive(receiver, first);
  await expect(receiver.getByRole("status")).toContainText(/invalid/i);
  await expect(gift(receiver)).toHaveAttribute("data-box-state", "ribboned");
  await receive(receiver, second);
  await expect(gift(receiver)).toHaveAttribute("data-box-state", "open");
  expect(
    await receiver.evaluate(() => localStorage.getItem("busycube:S-440:round")),
  ).toBeNull();
  await receiver.reload();
  await expect(gift(receiver)).toHaveAttribute("data-box-state", "closed");
  await receive(receiver, second);
  await expect(receiver.getByRole("status")).toContainText(/invalid/i);
  await expect(gift(receiver)).toHaveAttribute("data-box-state", "closed");
  await receiver
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect(receiver.locator(".s440-puzzle")).toHaveCount(0);
  await receive(receiver, second);
  await receiver.close();
});
