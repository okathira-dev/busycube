import { readFile } from "node:fs/promises";
import { gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { type Download, expect, test } from "@playwright/test";

test("downloads three real compressed questions, regenerates after a wrong batch and opens one box for the recovered formats", async ({
  page,
}) => {
  const downloads: Download[] = [];
  page.on("download", (download) => downloads.push(download));
  await page.goto("/?locale=en&stage=S-880");
  const links = page.locator(".s880-parcel a");
  const selects = page.locator(".s880-parcel select");
  await expect(links).toHaveCount(3);
  const box = page.getByRole("button", { name: /File with downward arrow/ });
  const confirm = page.getByRole("button", { name: "Confirm", exact: true });
  await expect(confirm).toBeDisabled();
  await box.click();
  await expect.poll(() => downloads.length).toBe(3);
  const readDownload = async (download: Download | undefined) => {
    if (!download) throw new Error("Missing download");
    const path = await download.path();
    if (!path) throw new Error("Missing downloaded bytes");
    return readFile(path);
  };
  const oldBytes = await Promise.all(downloads.map(readDownload));
  const firstNames = await links.allTextContents();
  for (const select of await selects.all()) await select.selectOption("gzip");
  await confirm.click();
  await expect(links.first()).not.toHaveText(firstNames[0] ?? "");
  await expect(confirm).toBeDisabled();
  for (const select of await selects.all())
    await expect(select).toHaveValue("");
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  await box.click();
  await expect.poll(() => downloads.length).toBe(6);
  const decode = {
    gzip: gunzipSync,
    deflate: inflateSync,
    "deflate-raw": inflateRawSync,
  };
  const formats: string[] = [];
  for (let index = 0; index < 3; index++) {
    const bytes = await readDownload(downloads[index + 3]);
    expect(bytes.equals(oldBytes[index] ?? Buffer.alloc(0))).toBe(false);
    expect(downloads[index + 3]?.suggestedFilename()).toMatch(
      /^parcel-2-[abc]\.compressed$/,
    );
    const matches = Object.entries(decode).filter(([, decoder]) => {
      try {
        return /^[0-9a-f]{2048}$/.test(decoder(bytes).toString("utf8"));
      } catch {
        return false;
      }
    });
    expect(matches).toHaveLength(1);
    const format = matches[0]?.[0];
    if (!format) throw new Error("Unrecognized external format");
    formats.push(format);
    await selects.nth(index).selectOption(format);
    await expect(
      page.locator('.stage-view .gift-box[data-box-state="open"]'),
    ).toHaveCount(0);
  }
  expect(new Set(formats).size).toBe(3);
  await confirm.click();
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(1);
  const secondBytes = await readDownload(downloads[3]);
  await links.first().click();
  await expect.poll(() => downloads.length).toBe(7);
  expect((await readDownload(downloads[6])).equals(secondBytes)).toBe(true);
});
