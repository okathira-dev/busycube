import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import sharp from "sharp";

const repositoryRoot = resolve(import.meta.dirname, "..");
const publicDirectory = resolve(repositoryRoot, "public");
const source = await readFile(resolve(publicDirectory, "icon.svg"));
const maskableSource = Buffer.from(
  source.toString("utf8").replace('rx="96"', 'rx="0"'),
);
const checkOnly = process.argv.includes("--check");

const icons = [
  { name: "icon-192.png", size: 192, input: source },
  { name: "icon-512.png", size: 512, input: source },
  { name: "icon-maskable-192.png", size: 192, input: maskableSource },
  { name: "icon-maskable-512.png", size: 512, input: maskableSource },
  { name: "apple-touch-icon.png", size: 180, input: maskableSource },
];

let hasDifference = false;

for (const icon of icons) {
  const outputPath = resolve(publicDirectory, icon.name);
  const generated = await sharp(icon.input)
    .resize(icon.size, icon.size)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  if (checkOnly) {
    const current = await readFile(outputPath).catch(() => undefined);
    if (!current?.equals(generated)) {
      console.error(`${icon.name} is missing or out of date`);
      hasDifference = true;
    }
    continue;
  }

  await writeFile(outputPath, generated);
  console.log(`generated ${icon.name} (${icon.size}x${icon.size})`);
}

if (hasDifference) {
  console.error("Run `pnpm run pwa:icons:generate` to update PWA icons.");
  process.exitCode = 1;
} else if (checkOnly) {
  console.log("PWA icons are up to date.");
}
