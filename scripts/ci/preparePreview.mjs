import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function preparePreview(
  directory,
  sourceConfig = "wrangler.jsonc",
) {
  const root = resolve(directory);
  let bytes = 0;
  let files = 0;
  async function inspect(path) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink())
      throw new Error("Preview artifact contains a symlink.");
    const name = basename(path);
    if (
      name === ".env" ||
      name.startsWith(".env.") ||
      name === ".dev.vars" ||
      name.startsWith(".dev.vars.") ||
      name === "node_modules" ||
      name === "wrangler.json" ||
      name === "wrangler.jsonc"
    ) {
      throw new Error(`Unexpected credential/config/tooling file: ${name}`);
    }
    if (stat.isDirectory()) {
      for (const child of await readdir(path)) await inspect(join(path, child));
    } else if (stat.isFile()) {
      bytes += stat.size;
      files += 1;
      if (bytes > 250 * 1024 * 1024 || files > 20000) {
        throw new Error("Preview artifact exceeds the allowed size.");
      }
    } else {
      throw new Error("Preview artifact must contain only regular files.");
    }
  }
  const names = (await readdir(root)).sort();
  if (names.join(",") !== "busycube,client") {
    throw new Error("Expected only the busycube and client build directories.");
  }
  await inspect(root);
  for (const file of ["busycube/index.js", "client/index.html"]) {
    if (!(await lstat(join(root, file))).isFile()) {
      throw new Error(`Missing preview entry point: ${file}`);
    }
  }
  // Artifact configuration is never read. Only main's reviewed configuration
  // can select the Worker, bindings or local upload behavior.
  const trusted = JSON.parse(await readFile(sourceConfig, "utf8"));
  if (trusted.name !== "busycube" || trusted.assets?.binding !== "ASSETS") {
    throw new Error(
      "Review the preview uploader when Worker/binding names change.",
    );
  }
  const config = {
    name: trusted.name,
    main: "./busycube/index.js",
    compatibility_date: trusted.compatibility_date,
    compatibility_flags: trusted.compatibility_flags ?? [],
    workers_dev: trusted.workers_dev,
    preview_urls: true,
    no_bundle: true,
    assets: {
      directory: "./client",
      binding: trusted.assets.binding,
      run_worker_first: trusted.assets.run_worker_first,
    },
  };
  await writeFile(join(root, "wrangler.json"), JSON.stringify(config, null, 2));
  return config;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await preparePreview(process.argv[2]);
}
