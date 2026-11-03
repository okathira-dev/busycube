import {
  applyPlayerOperation,
  createPlayerState,
  InvalidPlayerStateError,
  progressDocument,
} from "../domain/playerState";
import type { ProgressStore } from "../infra/progressStore";
import { PlayerController } from "./playerController";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
it("keeps operations performed while a write is in flight", async () => {
  let state = createPlayerState("ja");
  const first = deferred<void>();
  let writes = 0;
  const store: ProgressStore = {
    read: async () => state,
    commit: async (_locale, ops) => {
      if (++writes === 1) await first.promise;
      for (const op of ops) state = applyPlayerOperation(state, op);
      state = { ...state, revision: state.revision + 1 };
      return state;
    },
  };
  const player = new PlayerController(store, "ja");
  await player.refresh();
  const epoch = player.snapshot.state.epoch;
  const a = player.dispatch({
    kind: "solve",
    epoch,
    stageId: "S-000",
    boxId: "B01",
  });
  await Promise.resolve();
  const b = player.dispatch({
    kind: "solve",
    epoch,
    stageId: "S-010",
    boxId: "B01",
  });
  first.resolve();
  await a;
  expect(player.document.stages["S-010"]?.solvedBoxIds).toEqual(["B01"]);
  await b;
  expect(state.stages).toEqual(player.document.stages);
});
it("reports a reset race to the caller merging a backup", async () => {
  let state = createPlayerState("ja");
  const store: ProgressStore = {
    read: async () => state,
    commit: async (_locale, ops) => {
      state = {
        ...state,
        epoch: "other-reset",
        stages: {},
        revision: state.revision + 1,
      };
      for (const op of ops) state = applyPlayerOperation(state, op);
      return state;
    },
  };
  const player = new PlayerController(store, "ja");
  await player.refresh();
  expect(
    await player.dispatch({
      kind: "merge",
      epoch: state.epoch,
      progress: {
        ...progressDocument(state),
        stages: { "S-000": { solvedBoxIds: ["B01"] } },
      },
    }),
  ).toBe(false);
  expect(player.document.stages).toEqual({});
});
it("distinguishes corrupt and future state while refusing to write", async () => {
  for (const schemaVersion of [0, 99]) {
    const store: ProgressStore = {
      read: async () => {
        throw new InvalidPlayerStateError({ schemaVersion });
      },
      commit: vi.fn(),
    };
    const player = new PlayerController(store, "ja");
    expect(await player.refresh()).toBe(false);
    expect(player.snapshot.status).toBe(
      schemaVersion === 99 ? "future" : "corrupt",
    );
    expect(await player.dispatch({ kind: "locale", locale: "en" })).toBe(false);
    expect(store.commit).not.toHaveBeenCalled();
  }
});
