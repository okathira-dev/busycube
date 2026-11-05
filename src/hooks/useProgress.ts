import { useEffect, useRef, useSyncExternalStore } from "react";
import { hasStageMarker, type ProgressDocument } from "../domain/progress";
import type { Locale } from "../i18n";
import {
  IndexedDbProgressStore,
  type ProgressStore,
} from "../infra/progressStore";
import { PlayerController } from "../state/playerController";

export type StorageState =
  | "loading"
  | "ready"
  | "unavailable"
  | "corrupt"
  | "future";
export interface ProgressController {
  document: ProgressDocument;
  settings: { locale: Locale };
  epoch: string;
  initialized: boolean;
  storageState: StorageState;
  setLocale(locale: Locale): void;
  solve(stageId: string, boxId: string): void;
  mark(stageId: string, marker: string): void;
  hasMarker(stageId: string, marker: string): boolean;
  mergeProgress(document: ProgressDocument, epoch: string): Promise<boolean>;
  retryStorage(): Promise<boolean>;
  reset(): Promise<boolean>;
}
export function useProgress(
  initialLocale: Locale,
  store?: ProgressStore,
): ProgressController {
  const ref = useRef<PlayerController | null>(null);
  if (!ref.current)
    ref.current = new PlayerController(
      store ?? new IndexedDbProgressStore(),
      initialLocale,
    );
  const controller = ref.current;
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("busycube-player-v2");
      channel.onmessage = () => {
        void controller.refresh();
      };
    } catch {
      /* Focus refresh also works without messaging. */
    }
    controller.notify = () => {
      try {
        channel?.postMessage("changed");
      } catch {
        /* Focus refresh remains available. */
      }
    };
    const refresh = () => {
      if (document.visibilityState === "visible") void controller.refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    void controller.retry();
    return () => {
      controller.notify = undefined;
      channel?.close();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [controller]);
  const epoch = snapshot.state.epoch;
  return {
    document: controller.document,
    settings: snapshot.state.settings,
    epoch,
    initialized: snapshot.initialized,
    storageState: snapshot.status,
    setLocale: (locale) => {
      void controller.dispatch({ kind: "locale", locale });
    },
    solve: (stageId, boxId) => {
      void controller.dispatch({ kind: "solve", epoch, stageId, boxId });
    },
    mark: (stageId, marker) => {
      void controller.dispatch({ kind: "mark", epoch, stageId, marker });
    },
    hasMarker: (stageId, marker) =>
      hasStageMarker(controller.document, stageId, marker),
    mergeProgress: async (progress, expectedEpoch) => {
      if (controller.snapshot.state.epoch !== expectedEpoch) return false;
      return controller.dispatch({
        kind: "merge",
        epoch: expectedEpoch,
        progress,
      });
    },
    retryStorage: controller.retry,
    reset: () => controller.reset(),
  };
}
