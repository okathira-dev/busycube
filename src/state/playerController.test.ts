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

it("keeps temporary achievements and merges them with the latest data on first recovery", async () => {
  let state = createPlayerState("ja");
  state = applyPlayerOperation(state, {
    kind: "solve",
    epoch: state.epoch,
    stageId: "S-020",
    boxId: "B01",
  });
  const read = deferred<void>();
  let readable = false;
  const store: ProgressStore = {
    read: async () => {
      if (!readable) throw new Error("blocked");
      await read.promise;
      return state;
    },
    commit: vi.fn(async (_locale, operations) => {
      // A different tab has updated shared storage since recovery began.
      state = applyPlayerOperation(state, {
        kind: "solve",
        epoch: state.epoch,
        stageId: "S-030",
        boxId: "B01",
      });
      for (const operation of operations)
        state = applyPlayerOperation(state, operation);
      state = { ...state, revision: state.revision + 1 };
      return state;
    }),
  };
  const player = new PlayerController(store, "ja");
  await player.refresh();
  const temporaryEpoch = player.snapshot.state.epoch;
  await player.dispatch({
    kind: "solve",
    epoch: temporaryEpoch,
    stageId: "S-000",
    boxId: "B01",
  });
  await player.dispatch({
    kind: "mark",
    epoch: temporaryEpoch,
    stageId: "S-000",
    marker: "observed",
  });
  await player.dispatch({ kind: "locale", locale: "en" });
  expect(await player.retry()).toBe(false);
  expect(store.commit).not.toHaveBeenCalled();
  expect(player.document.stages["S-000"]).toEqual({
    solvedBoxIds: ["B01"],
    markers: ["observed"],
  });
  readable = true;
  const recovery = player.retry();
  await player.dispatch({
    kind: "solve",
    epoch: temporaryEpoch,
    stageId: "S-010",
    boxId: "B01",
  });
  read.resolve();
  expect(await recovery).toBe(true);
  expect(player.snapshot.state.settings.locale).toBe("en");
  expect(player.document.sourceStorageId).toBe(state.storageId);
  expect(Object.keys(state.stages).sort()).toEqual([
    "S-000",
    "S-010",
    "S-020",
    "S-030",
  ]);
  expect(player.document.stages).toEqual(state.stages);
  expect(player.snapshot.status).toBe("ready");
});

it("does not rebind recovered operations again after a different tab resets", async () => {
  let state = createPlayerState("ja");
  let readable = false;
  let writable = false;
  const store: ProgressStore = {
    read: async () => {
      if (!readable) throw new Error("blocked");
      return state;
    },
    commit: async (_locale, operations) => {
      if (!writable) throw new Error("quota");
      for (const operation of operations)
        state = applyPlayerOperation(state, operation);
      return state;
    },
  };
  const player = new PlayerController(store, "ja");
  await player.refresh();
  await player.dispatch({
    kind: "solve",
    epoch: player.snapshot.state.epoch,
    stageId: "S-000",
    boxId: "B01",
  });
  readable = true;
  expect(await player.retry()).toBe(false);
  expect(player.snapshot.initialized).toBe(true);
  expect(player.document.stages["S-000"]?.solvedBoxIds).toEqual(["B01"]);
  state = {
    ...state,
    epoch: "other-reset",
    revision: state.revision + 1,
    stages: {},
  };
  writable = true;
  expect(await player.retry()).toBe(true);
  expect(player.document.stages).toEqual({});
  expect(state.stages).toEqual({});
});

it("rejects a reset racing with the first recovered write", async () => {
  let state = createPlayerState("ja");
  let readable = false;
  const store: ProgressStore = {
    read: async () => {
      if (!readable) throw new Error("blocked");
      return state;
    },
    commit: async (_locale, operations) => {
      state = {
        ...state,
        epoch: "racing-reset",
        revision: state.revision + 1,
        stages: {},
      };
      for (const operation of operations)
        state = applyPlayerOperation(state, operation);
      return state;
    },
  };
  const player = new PlayerController(store, "ja");
  await player.refresh();
  await player.dispatch({
    kind: "solve",
    epoch: player.snapshot.state.epoch,
    stageId: "S-000",
    boxId: "B01",
  });
  readable = true;
  expect(await player.retry()).toBe(false);
  expect(player.document.stages).toEqual({});
  expect(state.stages).toEqual({});
});
