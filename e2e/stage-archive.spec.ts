import { expect, test } from "@playwright/test";

const folder = "s870-external-fixture";
async function chooser(
  page: import("@playwright/test").Page,
  nonempty = false,
) {
  await page.addInitScript(
    ({ folderName, nonempty }) => {
      const calls: unknown[] = [];
      Reflect.set(window, "archivePickerCalls", calls);
      window.showDirectoryPicker = async (options) => {
        calls.push(options);
        const root = await navigator.storage.getDirectory();
        const directory = await root.getDirectoryHandle(folderName, {
          create: true,
        });
        if (nonempty) {
          const file = await directory.getFileHandle("keep.txt", {
            create: true,
          });
          const writer = await file.createWritable();
          await writer.write("existing private fixture");
          await writer.close();
        }
        return directory;
      };
    },
    { folderName: folder, nonempty },
  );
}

test("the virtual archive only reveals the target and native file handles observe independent external changes", async ({
  page,
  context,
}, testInfo) => {
  await chooser(page);
  await page.goto("/?locale=en&stage=S-870");
  await page.getByRole("button", { name: "archive", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "delete-me.txt", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "rewrite-me.txt", exact: true })
    .click();
  expect(
    await page
      .getByRole("article", { name: "rewrite-me.txt" })
      .locator("pre")
      .textContent(),
  ).toBe("busycube{edited_outside_the_page}\n");
  await expect(
    page.getByText("UTF-8 · LF · final newline present"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "create-me.txt", exact: true })
    .click();
  expect(
    await page.evaluate(() => Reflect.get(window, "archivePickerCalls")),
  ).toEqual([]);
  const boxes = page.locator(".gift-box");
  for (const box of await boxes.all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.getByRole("button", { name: "Choose an empty folder" }).click();
  await expect(page.getByRole("status")).toHaveText("The folder is ready.");
  expect(
    await page.evaluate(() => Reflect.get(window, "archivePickerCalls")),
  ).toEqual([{ mode: "readwrite" }]);
  expect(
    await page.evaluate(async (name) => {
      const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(name);
      const names: string[] = [];
      for await (const handle of directory.values()) names.push(handle.name);
      return names.sort();
    }, folder),
  ).toEqual(["delete-me.txt", "rewrite-me.txt"]);
  const editor = await context.newPage();
  await editor.goto("/privacy/index.html");
  await editor.evaluate(async (name) => {
    const directory = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle(name);
    for (const [file, text] of [
      ["rewrite-me.txt", "busycube{edited_outside_the_page}\r\n"],
      ["create-me.txt", ""],
    ]) {
      const handle = await directory.getFileHandle(file, { create: true });
      const writer = await handle.createWritable();
      await writer.write(text);
      await writer.close();
    }
    await directory.removeEntry("delete-me.txt");
    await directory.getDirectoryHandle("delete-me.txt", { create: true });
  }, folder);
  await page.bringToFront();
  await expect(page.getByRole("status")).toHaveText("Error");
  for (const box of await boxes.all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
  await editor.evaluate(async (name) => {
    const directory = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle(name);
    await directory.removeEntry("delete-me.txt");
  }, folder);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(2)).not.toHaveAttribute("data-box-state", "open");
  await editor.evaluate(async (name) => {
    const directory = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle(name);
    for (const [file, text] of [
      ["rewrite-me.txt", "\uFEFFbusycube{edited_outside_the_page}\n"],
      ["create-me.txt", "different from the reference, but nonempty"],
    ]) {
      const handle = await directory.getFileHandle(file);
      const writer = await handle.createWritable();
      await writer.write(text);
      await writer.close();
    }
  }, folder);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  for (const box of await boxes.all())
    await expect(box).toHaveAttribute("data-box-state", "open");
  await page
    .getByRole("button", { name: "rewrite-me.txt", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("archive-reference.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("archive-reference-mobile.png"),
    fullPage: true,
  });
});

test("a native nonempty directory is preserved without seeds or false deletion progress", async ({
  page,
}) => {
  await chooser(page, true);
  await page.goto("/?locale=en&stage=S-870");
  await page.getByRole("button", { name: "Choose an empty folder" }).click();
  await expect(page.getByRole("status")).toContainText("non-empty folder");
  expect(
    await page.evaluate(async (name) => {
      const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(name);
      const names: string[] = [];
      for await (const entry of directory.values()) names.push(entry.name);
      return {
        names,
        text: await (
          await (await directory.getFileHandle("keep.txt")).getFile()
        ).text(),
      };
    }, folder),
  ).toEqual({ names: ["keep.txt"], text: "existing private fixture" });
  for (const box of await page.locator(".gift-box").all())
    await expect(box).not.toHaveAttribute("data-box-state", "open");
});
