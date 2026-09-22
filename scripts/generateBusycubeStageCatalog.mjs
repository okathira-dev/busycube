import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const stagesDirectory = resolve(repositoryRoot, "src", "stages");
const catalogPath = resolve(
  repositoryRoot,
  "docs",
  "specifications",
  "stage-catalog.md",
);

const entries = await readdir(stagesDirectory, { withFileTypes: true });
const stageDirectories = entries
  .filter((entry) => entry.isDirectory() && /^S-\d{3}$/.test(entry.name))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

for (const directory of stageDirectories) {
  const files = await readdir(resolve(stagesDirectory, directory));
  const missing = ["manifest.ts", "locale.ts", "stage.tsx"].filter(
    (file) => !files.includes(file),
  );
  if (missing.length > 0) {
    throw new Error(
      `${directory} must contain ${missing.join(", ")} before it can be indexed.`,
    );
  }
}

const localizedValue = (source, key) => {
  const match = source.match(
    new RegExp(
      `${key}\\s*[:=]\\s*\\{\\s*ja:\\s*"((?:\\\\.|[^"\\\\])*)"\\s*,\\s*en:\\s*"((?:\\\\.|[^"\\\\])*)"`,
      "s",
    ),
  );
  if (!match) return undefined;
  return {
    ja: JSON.parse(`"${match[1]}"`),
    en: JSON.parse(`"${match[2]}"`),
  };
};

const documentationValue = (source, labels) => {
  const block = [...source.matchAll(/\/\*\*([\s\S]*?)\*\//g)]
    .map((match) => match[1])
    .find((candidate) => candidate.includes("目的:"));
  if (!block) return undefined;
  const lines = block
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim());
  for (const label of labels) {
    const prefix = `${label}:`;
    const line = lines.find((candidate) => candidate.startsWith(prefix));
    if (line) return line.slice(prefix.length).trim();
  }
  return undefined;
};

const markdownCell = (value) =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/g, " ").trim();

const baselineLabels = {
  widely: "広く対応",
  newly: "新規対応",
  limited: "限定対応",
};

const permissionLabels = {
  none: "権限要求なし",
  required: "権限要求あり",
};

const catalogRows = [];
let totalBoxCount = 0;
for (const directory of stageDirectories) {
  const stageDirectory = resolve(stagesDirectory, directory);
  const [manifestSource, localeSource, stageSource, nameSource] =
    await Promise.all([
      readFile(resolve(stageDirectory, "manifest.ts"), "utf8"),
      readFile(resolve(stageDirectory, "locale.ts"), "utf8"),
      readFile(resolve(stageDirectory, "stage.tsx"), "utf8"),
      readFile(resolve(stageDirectory, "name.ts"), "utf8").catch((error) => {
        if (error.code === "ENOENT") return "";
        throw error;
      }),
    ]);
  const name =
    localizedValue(nameSource, "stageName") ??
    localizedValue(localeSource, "stageName") ??
    localizedValue(manifestSource, "name");
  const boxesSource = manifestSource.match(/boxes:\s*\[([\s\S]*?)\]/)?.[1];
  const boxes = boxesSource?.match(/"B\d+"/g) ?? [];
  const baseline = manifestSource.match(
    /baseline:\s*"(widely|newly|limited)"/,
  )?.[1];
  const permission = manifestSource.match(
    /permission:\s*"(none|required)"/,
  )?.[1];
  const purpose = documentationValue(stageSource, ["目的"]);
  const api = documentationValue(stageSource, ["使用API", "API/権限"]);
  if (
    !name ||
    boxes.length === 0 ||
    !baseline ||
    !permission ||
    !purpose ||
    !api
  ) {
    throw new Error(`${directory}からstage catalog用の情報を抽出できません。`);
  }
  totalBoxCount += boxes.length;
  catalogRows.push(
    `| [${directory}](../../src/stages/${directory}/stage.tsx) | ${markdownCell(name.ja)} / ${markdownCell(name.en)} | ${boxes.length} | ${markdownCell(purpose)} | ${markdownCell(api)} | ${baselineLabels[baseline]}・${permissionLabels[permission]} |`,
  );
}

const catalog = `# ステージ・ギミック一覧

このファイルは各stageのmanifest、locale、日本語JSDocから生成される。手作業で編集せず、ステージ追加・削除・説明変更時に\`pnpm run busycube:catalog:update\`を実行する。個別ステージの厳密な解法、privacy、対応環境は、IDからリンクした\`stage.tsx\`のJSDocを正本とする。negative case、cleanup、人手確認、UI・アクセシビリティ観点は\`docs/notes/stage-review.md\`で管理する。

- ステージ数: ${stageDirectories.length}
- 問題箱数: ${totalBoxCount}

| ID | ステージ | 箱数 | ギミック | API・権限 | 対応環境 |
| --- | --- | ---: | --- | --- | --- |
${catalogRows.join("\n")}
`;

await mkdir(dirname(catalogPath), { recursive: true });
await writeFile(catalogPath, catalog);
