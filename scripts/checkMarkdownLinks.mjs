import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const documentationRoots = [
  resolve(repositoryRoot, "docs"),
  resolve(repositoryRoot, "README.md"),
  resolve(repositoryRoot, "AGENTS.md"),
  resolve(repositoryRoot, "CLAUDE.md"),
];

const markdownFiles = [];

async function collect(path) {
  const entry = await stat(path);
  if (entry.isDirectory()) {
    const children = await readdir(path);
    await Promise.all(children.map((child) => collect(resolve(path, child))));
    return;
  }
  if ([".md", ".mdc"].includes(extname(path))) markdownFiles.push(path);
}

await Promise.all(documentationRoots.map(collect));

const failures = [];
for (const sourcePath of markdownFiles.sort()) {
  const source = await readFile(sourcePath, "utf8");
  const links = source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    const rawDestination = match[1].trim().replace(/^<|>$/g, "");
    const destination = rawDestination.split(/\s+"/)[0];
    if (
      destination.startsWith("#") ||
      destination.startsWith("/") ||
      /^[a-z][a-z0-9+.-]*:/i.test(destination)
    ) {
      continue;
    }
    const relativePath = decodeURIComponent(destination.split(/[?#]/)[0]);
    if (!relativePath) continue;
    const targetPath = resolve(dirname(sourcePath), relativePath);
    const exists = await stat(targetPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(
        `${sourcePath.slice(repositoryRoot.length + 1)}:${line} -> ${destination}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("存在しないローカルMarkdownリンクがあります:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `${markdownFiles.length}個のMarkdown文書のローカルリンクを確認しました。`,
  );
}
