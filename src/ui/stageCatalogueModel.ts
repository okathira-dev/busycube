import type { ProgressDocument } from "../domain/progress";
import { deriveStageProgress } from "../domain/stageRuntime";
import {
  deriveStageAccessKind,
  type StageAccessKind,
  type StageManifest,
} from "../runtime/stageContract";

export const stageAccessOrder: readonly StageAccessKind[] = [
  "baseline-direct",
  "baseline-permission",
  "limited",
];

const modelPrefix: Readonly<Record<StageAccessKind, string>> = {
  "baseline-direct": "D",
  "baseline-permission": "P",
  limited: "L",
};

export interface CatalogueStage {
  manifest: StageManifest;
  accessKind: StageAccessKind;
  displayCode: string;
}

/**
 * S-xxxは永続化とroutingの内部IDとして保ち、利用者向けの型番と表示順だけを
 * access groupから組み立てる。新しいstageは同じgroupの末尾へ追加される。
 */
export function buildCatalogueStages(
  stages: readonly StageManifest[],
): CatalogueStage[] {
  return stageAccessOrder.flatMap((accessKind) =>
    stages
      .filter((stage) => deriveStageAccessKind(stage.platform) === accessKind)
      .map((manifest, index) => ({
        manifest,
        accessKind,
        displayCode: `${modelPrefix[accessKind]}-${String(index + 1).padStart(3, "0")}`,
      })),
  );
}

export function findNextIncompleteStage(
  stages: readonly CatalogueStage[],
  progressStages: ProgressDocument["stages"],
): CatalogueStage | undefined {
  const withState = stages.map((stage) => ({
    stage,
    state: deriveStageProgress(
      stage.manifest.boxIds,
      new Set(progressStages[stage.manifest.id]?.solvedBoxIds ?? []),
    ),
  }));
  return (
    withState.find(({ state }) => state === "partial")?.stage ??
    withState.find(({ state }) => state === "untouched")?.stage
  );
}
