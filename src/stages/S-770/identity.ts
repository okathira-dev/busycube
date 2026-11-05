import type { GoogleFedCmResult } from "./functions";
export interface GoogleId {
  initialize(options: {
    client_id: string;
    auto_select: false;
    callback(result: GoogleFedCmResult): void;
  }): void;
  prompt(
    callback?: (notice: {
      isDismissedMoment?(): boolean;
      isSkippedMoment?(): boolean;
    }) => void,
  ): void;
  cancel(): void;
}
function currentId(): GoogleId | undefined {
  // The shared SDK also exposes Drive's oauth2 namespace; require the id API.
  const id = (
    window.google as unknown as { accounts?: { id?: GoogleId } } | undefined
  )?.accounts?.id;
  return id &&
    typeof id.initialize === "function" &&
    typeof id.prompt === "function" &&
    typeof id.cancel === "function"
    ? id
    : undefined;
}
export function loadIdentity(signal: AbortSignal): Promise<GoogleId> {
  const current = currentId();
  if (signal.aborted)
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  if (current) return Promise.resolve(current);
  return new Promise((resolve, reject) => {
    const url = "https://accounts.google.com/gsi/client";
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`,
    );
    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
      signal.removeEventListener("abort", abort);
    };
    const fail = (error: Error) => {
      cleanup();
      if (!existing) script.remove();
      reject(error);
    };
    const abort = () => fail(new DOMException("Aborted", "AbortError"));
    const failed = () => fail(new Error("Identity provider unavailable"));
    const loaded = () => {
      const id = currentId();
      if (!id) {
        failed();
        return;
      }
      cleanup();
      resolve(id);
    };
    const timer = setTimeout(failed, 10_000);
    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);
    signal.addEventListener("abort", abort, { once: true });
    if (!existing) {
      script.src = url;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });
}
