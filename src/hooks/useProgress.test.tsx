// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import {
  createProgressDocument,
  type ProgressDocument,
} from "../domain/progress";
import type { ProgressStore } from "../infra/progressStore";
import { useProgress } from "./useProgress";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function store(overrides: Partial<ProgressStore> = {}): ProgressStore {
  return {
    load: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("useProgress", () => {
  it("loads a valid stored document", async () => {
    const stored = createProgressDocument("en", "stored-installation");
    stored.stages["S-000"] = { solvedBoxIds: ["B01"] };
    const progressStore = store({ load: vi.fn(async () => stored) });
    const { result } = renderHook(() => useProgress("ja", progressStore));

    await waitFor(() => expect(result.current.storageState).toBe("ready"));

    expect(result.current.document).toEqual(stored);
    expect(progressStore.save).not.toHaveBeenCalled();
  });

  it("serializes writes and persists the newest document last", async () => {
    const firstSave = deferred<void>();
    const saves: ProgressDocument[] = [];
    const progressStore = store({
      save: vi.fn(async (document) => {
        saves.push(document);
        if (saves.length === 1) await firstSave.promise;
      }),
    });
    const { result } = renderHook(() => useProgress("ja", progressStore));

    await waitFor(() => expect(progressStore.save).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.solve("S-000", "B01");
      result.current.solve("S-000", "B02");
    });
    expect(progressStore.save).toHaveBeenCalledTimes(1);

    firstSave.resolve();
    await waitFor(() => expect(progressStore.save).toHaveBeenCalledTimes(3));

    expect(saves[2]?.stages["S-000"]?.solvedBoxIds).toEqual(["B01", "B02"]);
  });

  it("keeps the latest in-memory progress and retries after a save failure", async () => {
    let failWrites = false;
    const progressStore = store({
      save: vi.fn(async () => {
        if (failWrites) throw new Error("quota");
      }),
    });
    const { result } = renderHook(() => useProgress("ja", progressStore));
    await waitFor(() => expect(result.current.storageState).toBe("ready"));

    failWrites = true;
    act(() => result.current.solve("S-010", "B01"));
    await waitFor(() =>
      expect(result.current.storageState).toBe("unavailable"),
    );

    failWrites = false;
    await act(async () => {
      expect(await result.current.retryStorage()).toBe(true);
    });
    expect(result.current.storageState).toBe("ready");
    const lastSaved = vi.mocked(progressStore.save).mock.calls.at(-1)?.[0];
    expect(lastSaved?.stages["S-010"]?.solvedBoxIds).toEqual(["B01"]);
  });

  it("merges progress made after an initial load failure on retry", async () => {
    const stored = createProgressDocument("ja", "stored-installation");
    stored.stages["S-000"] = { solvedBoxIds: ["B01"] };
    let loadAttempts = 0;
    const progressStore = store({
      load: vi.fn(async () => {
        loadAttempts += 1;
        if (loadAttempts === 1) throw new Error("blocked");
        return stored;
      }),
    });
    const { result } = renderHook(() => useProgress("ja", progressStore));
    await waitFor(() =>
      expect(result.current.storageState).toBe("unavailable"),
    );

    act(() => result.current.solve("S-010", "B01"));
    await act(async () => {
      expect(await result.current.retryStorage()).toBe(true);
    });

    expect(result.current.document.installationId).toBe("stored-installation");
    expect(result.current.document.stages["S-000"]?.solvedBoxIds).toEqual([
      "B01",
    ]);
    expect(result.current.document.stages["S-010"]?.solvedBoxIds).toEqual([
      "B01",
    ]);
  });

  it("does not overwrite corrupt data and reports reset failure", async () => {
    const progressStore = store({
      load: vi.fn(async () => ({ schemaVersion: 1 })),
      clear: vi.fn(async () => {
        throw new Error("blocked");
      }),
    });
    const { result } = renderHook(() => useProgress("ja", progressStore));
    await waitFor(() => expect(result.current.storageState).toBe("corrupt"));
    expect(progressStore.save).not.toHaveBeenCalled();

    await act(async () => {
      expect(await result.current.reset()).toBe(false);
    });
    expect(result.current.storageState).toBe("unavailable");
  });
});
