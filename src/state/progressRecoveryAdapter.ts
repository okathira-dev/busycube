// FSL adapter: real PlayerController, controlled storage outcomes.
// UI fields are source projections; progressRecoveryUi.test.tsx checks the components.
import {
  applyPlayerOperation,
  createPlayerState,
  InvalidPlayerStateError,
} from "../domain/playerState";
import type { ProgressStore } from "../infra/progressStore";
import { PlayerController } from "./playerController";

export function createRecoveryAdapter() {
  let stored = createPlayerState("en");
  let readOutcome: unknown = "Success";
  let writeOk = true;
  let accepted = false;
  let temporaryAccepted = false;
  let exportedPlaceholder = false;
  const store: ProgressStore = {
    read: async () => {
      if (readOutcome === "AccessFailure")
        throw new Error("Storage unavailable");
      if (readOutcome === "InvalidData")
        throw new InvalidPlayerStateError({ schemaVersion: 0 });
      if (readOutcome === "NewerData")
        throw new InvalidPlayerStateError({ schemaVersion: 99 });
      return stored;
    },
    commit: async (_locale, operations) => {
      if (!writeOk) throw new Error("Write failed");
      for (const operation of operations)
        stored = applyPlayerOperation(stored, operation);
      stored = { ...stored, revision: stored.revision + 1 };
      return stored;
    },
  };
  let player = new PlayerController(store, "en");
  const hasBox = (stages: typeof stored.stages) =>
    stages["S-000"]?.solvedBoxIds.includes("B01") ?? false;
  const statusName = {
    loading: "Loading",
    ready: "Ready",
    unavailable: "Unavailable",
    corrupt: "Corrupt",
    future: "Future",
  };
  return {
    async reset() {
      stored = createPlayerState("en");
      player = new PlayerController(store, "en");
      accepted = false;
      temporaryAccepted = false;
      exportedPlaceholder = false;
    },
    async step(action: string, params: Record<string, unknown>) {
      if (action === "read") {
        readOutcome = params.outcome;
        await player.refresh();
      } else if (action === "solve") {
        writeOk = params.ok === true;
        accepted = true;
        temporaryAccepted ||= !player.snapshot.initialized;
        await player.dispatch({
          kind: "solve",
          epoch: player.snapshot.state.epoch,
          stageId: "S-000",
          boxId: "B01",
        });
      } else if (action === "retry") {
        readOutcome = params.ok ? "Success" : "AccessFailure";
        writeOk = params.ok === true;
        await player.retry();
      } else if (action === "export") {
        const exported = JSON.parse(JSON.stringify(player.document));
        exportedPlaceholder ||= exported.sourceStorageId !== stored.storageId;
      } else if (action === "reload") {
        player = new PlayerController(store, "en");
        accepted = false;
        temporaryAccepted = false;
        exportedPlaceholder = false;
      } else throw new Error(`Unknown FSL action: ${action}`);
    },
    observe(): Record<string, unknown> {
      const { initialized, status } = player.snapshot;
      // Read-only instrumentation of the real pending queue, not a second queue.
      const pending = Reflect.get(player, "pending");
      if (!Array.isArray(pending)) throw new Error("Missing pending queue");
      return {
        initialized,
        status: statusName[status],
        disk: hasBox(stored.stages),
        visible: hasBox(player.document.stages),
        pending: pending.length > 0,
        accepted,
        temporaryAccepted,
        playEnabled: status !== "loading",
        spinner: status === "loading",
        retryOffered: status !== "ready" && status !== "loading",
        exportEnabled: initialized,
        exportedPlaceholder,
      };
    },
  };
}
