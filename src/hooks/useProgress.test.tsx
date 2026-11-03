// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { applyPlayerOperation, createPlayerState } from "../domain/playerState";
import type { ProgressStore } from "../infra/progressStore";
import { useProgress } from "./useProgress";

function memoryStore() {
  let state = createPlayerState("ja");
  const store: ProgressStore = {
    read: vi.fn(async () => state),
    commit: vi.fn(async (_locale, operations) => {
      for (const operation of operations)
        state = applyPlayerOperation(state, operation);
      state = { ...state, revision: state.revision + 1 };
      return state;
    }),
  };
  return store;
}
it("keeps both tabs clears when the other changes language", async () => {
  const store = memoryStore();
  const a = renderHook(() => useProgress("ja", store));
  const b = renderHook(() => useProgress("ja", store));
  await waitFor(() =>
    expect(a.result.current.initialized && b.result.current.initialized).toBe(
      true,
    ),
  );
  act(() => {
    a.result.current.solve("S-000", "B01");
    b.result.current.setLocale("en");
    b.result.current.solve("S-010", "B01");
  });
  await act(async () => {
    await a.result.current.retryStorage();
    await b.result.current.retryStorage();
    await a.result.current.retryStorage();
  });
  expect(a.result.current.document.stages).toEqual({
    "S-000": { solvedBoxIds: ["B01"] },
    "S-010": { solvedBoxIds: ["B01"] },
  });
  expect(a.result.current.settings.locale).toBe("en");
});
it("preserves pending operations through write failure and retry", async () => {
  const store = memoryStore();
  const commit = store.commit;
  const { result } = renderHook(() => useProgress("ja", store));
  await waitFor(() => expect(result.current.initialized).toBe(true));
  store.commit = vi.fn(async () => {
    throw new Error("quota");
  });
  act(() => result.current.solve("S-000", "B01"));
  await waitFor(() => expect(result.current.storageState).toBe("unavailable"));
  store.commit = commit;
  await act(async () => {
    expect(await result.current.retryStorage()).toBe(true);
  });
  expect(result.current.document.stages["S-000"]?.solvedBoxIds).toEqual([
    "B01",
  ]);
});
it("rejects callbacks and imports captured before another tab resets", async () => {
  const store = memoryStore();
  const a = renderHook(() => useProgress("ja", store));
  const b = renderHook(() => useProgress("ja", store));
  await waitFor(() =>
    expect(a.result.current.initialized && b.result.current.initialized).toBe(
      true,
    ),
  );
  const old = a.result.current;
  const id = old.document.sourceStorageId;
  await act(async () => {
    await b.result.current.reset();
  });
  act(() => old.solve("S-000", "B01"));
  await act(async () => {
    await a.result.current.retryStorage();
  });
  expect(a.result.current.document.stages).toEqual({});
  expect(a.result.current.document.sourceStorageId).toBe(id);
  expect(a.result.current.epoch).not.toBe(old.epoch);
  await act(async () => {
    expect(await a.result.current.mergeProgress(old.document, old.epoch)).toBe(
      false,
    );
  });
});
it("does not initialize or overwrite after a read failure", async () => {
  const store = memoryStore();
  const read = store.read;
  store.read = vi.fn(async () => {
    throw new Error("blocked");
  });
  const { result } = renderHook(() => useProgress("ja", store));
  await waitFor(() => expect(result.current.storageState).toBe("unavailable"));
  expect(result.current.initialized).toBe(false);
  expect(store.commit).not.toHaveBeenCalled();
  store.read = read;
  await act(async () => {
    expect(await result.current.retryStorage()).toBe(true);
  });
  expect(result.current.initialized).toBe(true);
});
