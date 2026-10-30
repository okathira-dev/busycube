import { stageWorker, workerRequest } from "../shared/workerChannel";

export const downloadChannel = "busycube-download-v1";
export const downloadScript = "/background-fetch/download-sw.js";
export interface DownloadState {
  id: string | null;
  status: "idle" | "prepared" | "active" | "success" | "aborted" | "failed";
  successId: string | null;
  abortId: string | null;
}
export interface Download extends EventTarget {
  readonly id: string;
  readonly downloaded: number;
  readonly downloadTotal: number;
  readonly result: string;
}
export interface DownloadManager {
  get(id: string): Promise<Download | undefined>;
  fetch(
    id: string,
    requests: string[],
    options: {
      title: string;
      downloadTotal: number;
      icons: { src: string; sizes: string; type: string }[];
    },
  ): Promise<Download>;
}
export const downloadWorker = (signal: AbortSignal) =>
  stageWorker(downloadScript, "/background-fetch/", signal);
export function downloadManager(registration: ServiceWorkerRegistration) {
  return (
    registration as ServiceWorkerRegistration & {
      backgroundFetch?: DownloadManager;
    }
  ).backgroundFetch;
}
function isState(value: unknown): value is DownloadState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DownloadState>;
  const id = (value: unknown) =>
    value === null ||
    (typeof value === "string" && /^busycube-s960-[0-9a-f-]{36}$/i.test(value));
  return (
    id(v.id) &&
    id(v.successId) &&
    id(v.abortId) &&
    ["idle", "prepared", "active", "success", "aborted", "failed"].includes(
      v.status ?? "",
    )
  );
}
export const downloadRequest = (
  worker: ServiceWorker,
  action: "read" | "prepare" | "arm" | "failed",
  signal: AbortSignal,
  id?: string,
) => workerRequest(worker, downloadChannel, { action, id }, signal, isState);
