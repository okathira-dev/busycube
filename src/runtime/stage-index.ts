import type { StageManifest } from "./stageContract";

const stageModules = import.meta.glob<{ manifest: StageManifest }>(
  "../stages/S-*/manifest.ts",
  { eager: true },
);

export const stageIndex = Object.values(stageModules)
  .map((module) => module.manifest)
  .sort((left, right) => left.id.localeCompare(right.id));

export type StageId = (typeof stageIndex)[number]["id"];
