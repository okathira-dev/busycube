import type { Locale } from "../i18n";
import {
  createProgressDocument,
  markStage,
  mergeProgressDocuments,
  type ProgressDocument,
  parseProgressDocument,
  solveBox,
} from "./progress";

export interface PlayerState {
  schemaVersion: 1;
  storageId: string;
  revision: number;
  settings: { locale: Locale };
  epoch: string;
  stages: ProgressDocument["stages"];
}
export type PlayerOperation =
  | { kind: "solve"; epoch: string; stageId: string; boxId: string }
  | { kind: "mark"; epoch: string; stageId: string; marker: string }
  | { kind: "merge"; epoch: string; progress: ProgressDocument }
  | { kind: "locale"; locale: Locale }
  | { kind: "reset"; epoch: string; nextEpoch: string };
export function createPlayerState(locale: Locale): PlayerState {
  return {
    schemaVersion: 1,
    storageId: crypto.randomUUID(),
    revision: 0,
    settings: { locale },
    epoch: crypto.randomUUID(),
    stages: {},
  };
}
export function progressDocument(state: PlayerState): ProgressDocument {
  return { ...createProgressDocument(state.storageId), stages: state.stages };
}
export function applyPlayerOperation(
  state: PlayerState,
  operation: PlayerOperation,
): PlayerState {
  if (operation.kind === "locale")
    return { ...state, settings: { locale: operation.locale } };
  if (operation.epoch !== state.epoch) return state;
  if (operation.kind === "reset")
    return { ...state, epoch: operation.nextEpoch, stages: {} };
  const progress = progressDocument(state);
  const next =
    operation.kind === "solve"
      ? solveBox(progress, operation.stageId, operation.boxId)
      : operation.kind === "mark"
        ? markStage(progress, operation.stageId, operation.marker)
        : mergeProgressDocuments(progress, operation.progress);
  return { ...state, stages: next.stages };
}
export function isPlayerState(value: unknown): value is PlayerState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PlayerState>;
  return (
    state.schemaVersion === 1 &&
    typeof state.storageId === "string" &&
    state.storageId.length > 0 &&
    typeof state.epoch === "string" &&
    state.epoch.length > 0 &&
    Number.isSafeInteger(state.revision) &&
    (state.revision ?? -1) >= 0 &&
    (state.settings?.locale === "ja" || state.settings?.locale === "en") &&
    parseStages(state.stages)
  );
}

function parseStages(stages: unknown): boolean {
  return (
    parseProgressDocument({
      schemaVersion: 2,
      sourceStorageId: "validation",
      stages,
    }).status === "valid"
  );
}

export class InvalidPlayerStateError extends Error {
  readonly status: "corrupt" | "future";
  constructor(value: unknown) {
    super("Invalid player state");
    this.status =
      value &&
      typeof value === "object" &&
      "schemaVersion" in value &&
      typeof value.schemaVersion === "number" &&
      value.schemaVersion > 1
        ? "future"
        : "corrupt";
  }
}
