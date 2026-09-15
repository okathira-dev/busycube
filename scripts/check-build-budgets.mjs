import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";

const clientDirectory = resolve(import.meta.dirname, "../dist/client");
const assetsDirectory = resolve(clientDirectory, "assets");
const budgets = {
  initialGzip: 225 * 1024,
  largestJavaScriptGzip: 140 * 1024,
  largestJavaScriptRaw: 540 * 1024,
};

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
const gzipSize = async (path) => gzipSync(await readFile(path)).byteLength;
const html = await readFile(resolve(clientDirectory, "index.html"), "utf8");
const initialAssetNames = [
  ...new Set(
    Array.from(
      html.matchAll(/(?:src|href)="\/assets\/([^"?]+\.(?:css|js))"/g),
      (match) => match[1],
    ),
  ),
];

if (initialAssetNames.length === 0) {
  throw new Error("dist/client/index.htmlに初期assetが見つかりません。");
}

const initialGzip = (
  await Promise.all(
    initialAssetNames.map((name) => gzipSize(resolve(assetsDirectory, name))),
  )
).reduce((sum, size) => sum + size, 0);
const javaScriptNames = (await readdir(assetsDirectory)).filter((name) =>
  name.endsWith(".js"),
);
const javaScriptSizes = await Promise.all(
  javaScriptNames.map(async (name) => {
    const path = resolve(assetsDirectory, name);
    return {
      name,
      raw: (await stat(path)).size,
      gzip: await gzipSize(path),
    };
  }),
);
const largestRaw = javaScriptSizes.reduce((largest, asset) =>
  asset.raw > largest.raw ? asset : largest,
);
const largestGzip = javaScriptSizes.reduce((largest, asset) =>
  asset.gzip > largest.gzip ? asset : largest,
);

const measurements = [
  {
    label: `initial assets (${initialAssetNames.length} files, gzip)`,
    actual: initialGzip,
    budget: budgets.initialGzip,
  },
  {
    label: `largest JavaScript gzip (${largestGzip.name})`,
    actual: largestGzip.gzip,
    budget: budgets.largestJavaScriptGzip,
  },
  {
    label: `largest JavaScript raw (${largestRaw.name})`,
    actual: largestRaw.raw,
    budget: budgets.largestJavaScriptRaw,
  },
];

let exceeded = false;
for (const measurement of measurements) {
  const result =
    measurement.actual <= measurement.budget ? "PASS" : "OVER BUDGET";
  console.log(
    `${result}: ${measurement.label} ${formatKiB(measurement.actual)} / ${formatKiB(measurement.budget)}`,
  );
  exceeded ||= measurement.actual > measurement.budget;
}

if (exceeded) {
  process.exitCode = 1;
}
