import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const output = "src/state/progressRecovery.conformance.test.ts";
const result = spawnSync(
  "fslc",
  [
    "testgen",
    "docs/specifications/fsl/progress-recovery.fsl",
    "--target",
    "vitest",
    "--depth",
    "8",
    "-o",
    output,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Keep the generated oracle vectors; wire the synchronous scaffold to our async adapter.
let source = readFileSync(output, "utf8");
source = `// @vitest-environment jsdom\n${source}`
  .replace(
    'import { test, expect } from "vitest";',
    'import { test, expect } from "vitest";\nimport { createRecoveryAdapter } from "./progressRecoveryAdapter";',
  )
  .replace("reset(): void;", "reset(): Promise<void>;")
  .replace(
    "step(action: string, params: Record<string, unknown>): StepResult | void;",
    "step(action: string, params: Record<string, unknown>): Promise<void>;",
  )
  .replace(
    'throw new Error("wire your implementation: implement makeAdapter()");',
    "return createRecoveryAdapter();",
  )
  .replace("  adapter.reset();\n  adapter.observe();\n", "")
  .replaceAll("body: () => void", "body: () => Promise<void>")
  .replaceAll("test(name, () => {", "test(name, async () => {")
  .replaceAll("    body();", "    await body();")
  .replaceAll(", () => {", ", async () => {")
  .replaceAll("adapter.reset();", "await adapter.reset();")
  .replaceAll("adapter.step(", "await adapter.step(");
const unusedType = source.indexOf("export interface StepResult");
const contractComment = source.indexOf("/**", unusedType);
const unusedHelpers = source.indexOf("function assertRejected(");
const scenarios = source.indexOf(
  'scenario("scenario: cover_read"',
  unusedHelpers,
);
if (
  [unusedType, contractComment, unusedHelpers, scenarios].some(
    (offset) => offset < 0,
  )
) {
  throw new Error(
    "FSL testgen scaffold changed; review adapter wiring before regenerating",
  );
}
source =
  source.slice(0, unusedHelpers) +
  "const adapter = makeAdapter();\nfunction scenario(name: string, body: () => Promise<void>): void { test(name, body); }\n\n" +
  source.slice(scenarios);
source = source.slice(0, unusedType) + source.slice(contractComment);
source = source.replace(
  / \* Wire `makeAdapter\(\)`[\s\S]*?(?= \* The random-walk)/,
  " * Regenerate with pnpm exec node scripts/generateProgressRecoveryTests.mjs.\n * Adapter calls are awaited; generated oracle vectors are unchanged.\n *\n",
);
writeFileSync(output, source);
const format = spawnSync(
  process.execPath,
  ["node_modules/@biomejs/biome/bin/biome", "check", "--write", output],
  { stdio: "inherit" },
);
if (format.error) throw format.error;
if (format.status !== 0) process.exit(format.status ?? 1);
