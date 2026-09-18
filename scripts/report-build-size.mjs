import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const clientDirectory = resolve(import.meta.dirname, "../dist/client");
const manifest = JSON.parse(
  await readFile(resolve(clientDirectory, ".vite/manifest.json"), "utf8"),
);
const entryKeys = process.argv.slice(2);
const selectedKeys = entryKeys.length
  ? entryKeys
  : Object.keys(manifest).filter((key) => manifest[key].isEntry);
const sizes = new Map();

function dependencies(key, files = new Set(), visited = new Set()) {
  if (visited.has(key)) return files;
  visited.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error(`Unknown manifest entry: ${key}`);
  files.add(entry.file);
  for (const file of entry.css ?? []) files.add(file);
  for (const dependency of entry.imports ?? [])
    dependencies(dependency, files, visited);
  return files;
}

async function measure(files) {
  const total = { files: files.size, raw: 0, gzip: 0, brotli: 0 };
  for (const file of files) {
    if (!sizes.has(file)) {
      const body = await readFile(resolve(clientDirectory, file));
      sizes.set(file, {
        raw: body.byteLength,
        gzip: gzipSync(body).byteLength,
        brotli: brotliCompressSync(body, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
        }).byteLength,
      });
    }
    const asset = sizes.get(file);
    for (const unit of ["raw", "gzip", "brotli"]) total[unit] += asset[unit];
  }
  return total;
}

const shell = dependencies("index.html");
const entries = {};
for (const key of selectedKeys) {
  const files = dependencies(key);
  entries[key] = {
    staticDependencies: await measure(files),
    additionalToMainShell: await measure(
      new Set([...files].filter((file) => !shell.has(file))),
    ),
    dynamicImports: manifest[key].dynamicImports ?? [],
  };
}
console.log(
  JSON.stringify(
    {
      units: "bytes",
      scope:
        "JS/CSS static import closure; runtime media, dynamic imports, HTML and SW precache excluded",
      compression: { gzip: "Node default", brotliQuality: 5 },
      entries,
    },
    null,
    2,
  ),
);
