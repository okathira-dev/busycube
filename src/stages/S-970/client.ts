import { stageWorker, workerRequest } from "../shared/workerChannel";
export const contentChannel = "busycube-content-v1",
  contentScript = "/content-index/content-sw.js";
export interface ContentState {
  id: string | null;
  status: "idle" | "preparing" | "saved" | "deleted" | "failed";
  saved: boolean;
  openId: string | null;
  deleteId: string | null;
  cleanupPending: boolean;
}
function isState(value: unknown): value is ContentState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ContentState>;
  const id = (value: unknown) =>
    value === null ||
    (typeof value === "string" && /^busycube-s970-[0-9a-f-]{36}$/i.test(value));
  return (
    id(v.id) &&
    id(v.openId) &&
    id(v.deleteId) &&
    ["idle", "preparing", "saved", "deleted", "failed"].includes(
      v.status ?? "",
    ) &&
    typeof v.saved === "boolean" &&
    typeof v.cleanupPending === "boolean"
  );
}
export const contentWorker = (signal: AbortSignal) =>
  stageWorker(contentScript, "/content-index/", signal);
export const contentRequest = (
  worker: ServiceWorker,
  action: "read" | "save",
  signal: AbortSignal,
  locale: string,
) => workerRequest(worker, contentChannel, { action, locale }, signal, isState);
