import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deflateRawSync,
  deflateSync,
  gunzipSync,
  gzipSync,
  inflateRawSync,
  inflateSync,
} from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = resolve(root, "src/fixtures/s880/assets");

const parcels = [
  {
    asset: "parcel-a.gz",
    format: "gzip",
    marker: "pocket compass",
    compress: gzipSync,
    decompress: gunzipSync,
  },
  {
    asset: "parcel-b.deflate",
    format: "deflate",
    marker: "violet ledger",
    compress: deflateSync,
    decompress: inflateSync,
  },
  {
    asset: "parcel-c.raw",
    format: "deflate-raw",
    marker: "ember receipt",
    compress: deflateRawSync,
    decompress: inflateRawSync,
  },
];

function payload(marker) {
  const header = `busycube parcel manifest\nmarker=${marker}\n`;
  const body = "abcdefghijklmnopqrstuvwxyz0123456789\n";
  return Buffer.from((header + body.repeat(2048)).slice(0, 65_536), "utf8");
}

await mkdir(assetRoot, { recursive: true });
for (const parcel of parcels) {
  const bytes = payload(parcel.marker);
  const compressed = parcel.compress(bytes, { level: 9, mtime: 0 });
  if (!parcel.decompress(compressed).equals(bytes))
    throw new Error(`Generated ${parcel.asset} could not be decompressed.`);
  await writeFile(resolve(assetRoot, parcel.asset), compressed);
}
