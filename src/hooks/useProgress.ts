import { useCallback, useEffect, useRef, useState } from "react";
import {
  createProgressDocument,
  hasStageMarker,
  markStage,
  mergeProgressDocuments,
  type ProgressDocument,
  parseProgressDocument,
  solveBox,
} from "../domain/progress";
import type { Locale } from "../i18n";
import {
  IndexedDbProgressStore,
  type ProgressStore,
} from "../infra/progressStore";
import { clearSynchronousFlags } from "../infra/synchronousFlags";

export type StorageState =
  | "loading"
  | "ready"
  | "unavailable"
  | "corrupt"
  | "future";

export interface ProgressController {
  document: ProgressDocument;
  storageState: StorageState;
  setLocale(locale: Locale): void;
  solve(stageId: string, boxId: string): void;
  hasMarker(stageId: string, marker: string): boolean;
  mark(stageId: string, marker: string): void;
  replaceDocument(
    change: (current: ProgressDocument) => ProgressDocument,
  ): void;
  retryStorage(): Promise<boolean>;
  reset(): Promise<boolean>;
}

export function useProgress(
  initialLocale: Locale,
  store: ProgressStore = new IndexedDbProgressStore(),
): ProgressController {
  const storeRef = useRef(store);
  const [document, setDocument] = useState(() =>
    createProgressDocument(initialLocale),
  );
  const initialDocumentRef = useRef(document);
  const documentRef = useRef(document);
  const [storageState, setStorageState] = useState<StorageState>("loading");
  const writableRef = useRef(false);
  const dirtyBeforeLoadRef = useRef(false);
  const latestUnsavedRef = useRef<ProgressDocument | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const loadGenerationRef = useRef(0);

  const updateStorageState = useCallback((next: StorageState) => {
    setStorageState(next);
  }, []);

  const updateDocument = useCallback((next: ProgressDocument) => {
    documentRef.current = next;
    setDocument(next);
  }, []);

  const queueSave = useCallback(
    async (next: ProgressDocument): Promise<boolean> => {
      latestUnsavedRef.current = next;
      const save = writeQueueRef.current
        .catch(() => undefined)
        .then(() => storeRef.current.save(next));
      writeQueueRef.current = save;
      try {
        await save;
        if (latestUnsavedRef.current === next) {
          latestUnsavedRef.current = null;
          updateStorageState("ready");
        }
        return true;
      } catch {
        updateStorageState("unavailable");
        return false;
      }
    },
    [updateStorageState],
  );

  const loadFromStore = useCallback(
    async (mergeUnsaved: boolean): Promise<boolean> => {
      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      updateStorageState("loading");
      try {
        const raw = await storeRef.current.load();
        if (generation !== loadGenerationRef.current) return false;
        if (raw === null) {
          writableRef.current = true;
          const next = documentRef.current;
          dirtyBeforeLoadRef.current = false;
          return queueSave(next);
        }

        const parsed = parseProgressDocument(raw);
        if (parsed.status === "future") {
          writableRef.current = false;
          updateStorageState("future");
          return false;
        }
        if (parsed.status === "corrupt") {
          writableRef.current = false;
          updateStorageState("corrupt");
          return false;
        }

        writableRef.current = true;
        const next =
          mergeUnsaved && dirtyBeforeLoadRef.current
            ? {
                ...mergeProgressDocuments(parsed.document, documentRef.current),
                settings: documentRef.current.settings,
              }
            : parsed.document;
        updateDocument(next);
        dirtyBeforeLoadRef.current = false;
        if (next !== parsed.document) return queueSave(next);
        latestUnsavedRef.current = null;
        updateStorageState("ready");
        return true;
      } catch {
        if (generation !== loadGenerationRef.current) return false;
        updateStorageState("unavailable");
        return false;
      }
    },
    [queueSave, updateDocument, updateStorageState],
  );

  useEffect(() => {
    documentRef.current = initialDocumentRef.current;
    void loadFromStore(false);
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [loadFromStore]);

  const replaceDocument = useCallback(
    (change: (current: ProgressDocument) => ProgressDocument) => {
      const current = documentRef.current;
      const next = change(current);
      if (next === current) return;
      updateDocument(next);
      if (writableRef.current) {
        void queueSave(next);
      } else {
        dirtyBeforeLoadRef.current = true;
      }
    },
    [queueSave, updateDocument],
  );

  const setLocale = useCallback(
    (locale: Locale) => {
      replaceDocument((current) =>
        current.settings.locale === locale
          ? current
          : {
              ...current,
              settings: { ...current.settings, locale },
            },
      );
    },
    [replaceDocument],
  );

  const retryStorage = useCallback(async () => {
    if (writableRef.current) {
      return queueSave(latestUnsavedRef.current ?? documentRef.current);
    }
    return loadFromStore(true);
  }, [loadFromStore, queueSave]);

  const reset = useCallback(async () => {
    const next = createProgressDocument(documentRef.current.settings.locale);
    const resetTask = writeQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await storeRef.current.clear();
        clearSynchronousFlags();
        await storeRef.current.save(next);
      });
    writeQueueRef.current = resetTask;
    try {
      await resetTask;
      writableRef.current = true;
      dirtyBeforeLoadRef.current = false;
      latestUnsavedRef.current = null;
      updateDocument(next);
      updateStorageState("ready");
      return true;
    } catch {
      updateStorageState("unavailable");
      return false;
    }
  }, [updateDocument, updateStorageState]);

  const solve = useCallback(
    (stageId: string, boxId: string) => {
      replaceDocument((current) => solveBox(current, stageId, boxId));
    },
    [replaceDocument],
  );

  const hasMarker = useCallback(
    (stageId: string, marker: string) =>
      hasStageMarker(document, stageId, marker),
    [document],
  );

  const mark = useCallback(
    (stageId: string, marker: string) => {
      replaceDocument((current) => markStage(current, stageId, marker));
    },
    [replaceDocument],
  );

  return {
    document,
    storageState,
    setLocale,
    solve,
    hasMarker,
    mark,
    replaceDocument,
    retryStorage,
    reset,
  };
}
