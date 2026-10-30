import contract from "../../fixtures/s900/assets/media-source-segments.json";
import type { S900ReelId } from "./functions";

export const segments = {
  "lead.webm": new URL(
    "../../fixtures/s900/assets/lead.webm?no-inline",
    import.meta.url,
  ).href,
  "a.webm": new URL(
    "../../fixtures/s900/assets/a.webm?no-inline",
    import.meta.url,
  ).href,
  "b.webm": new URL(
    "../../fixtures/s900/assets/b.webm?no-inline",
    import.meta.url,
  ).href,
  "c.webm": new URL(
    "../../fixtures/s900/assets/c.webm?no-inline",
    import.meta.url,
  ).href,
  "d.webm": new URL(
    "../../fixtures/s900/assets/d.webm?no-inline",
    import.meta.url,
  ).href,
};
export const reelUrl = (id: S900ReelId) =>
  segments[contract.reels[id].file as keyof typeof segments];
function wait(
  target: EventTarget,
  type: string,
  signal: AbortSignal,
  action?: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener(type, success);
      target.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const success = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("MediaSource failed"));
    };
    const aborted = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(failed, 15_000);
    target.addEventListener(type, success, { once: true });
    target.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) {
      aborted();
      return;
    }
    try {
      action?.();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
export async function splice(
  order: readonly S900ReelId[],
  signal: AbortSignal,
) {
  if (!MediaSource.isTypeSupported(contract.mimeType))
    throw new Error("Unsupported media");
  const descriptions = [
    contract.leadIn,
    ...order.map((id) => contract.reels[id]),
  ];
  const buffers = await Promise.all(
    descriptions.map(async (part) => {
      const response = await fetch(
        segments[part.file as keyof typeof segments],
        { signal },
      );
      if (!response.ok) throw new Error("Reel unavailable");
      return { bytes: await response.arrayBuffer(), frames: part.frames };
    }),
  );
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const source = new MediaSource(),
    url = URL.createObjectURL(source),
    controller = new AbortController();
  let buffer: SourceBuffer | null = null,
    disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    controller.abort();
    signal.removeEventListener("abort", dispose);
    if (source.readyState === "open") {
      try {
        if (buffer?.updating) buffer.abort();
        source.endOfStream();
      } catch {}
    }
    URL.revokeObjectURL(url);
  };
  signal.addEventListener("abort", dispose, { once: true });
  const ready = (async () => {
    try {
      await wait(source, "sourceopen", controller.signal);
      buffer = source.addSourceBuffer(contract.mimeType);
      buffer.mode = "segments";
      let timestamp = 0;
      for (const part of buffers) {
        if (controller.signal.aborted)
          throw new DOMException("Aborted", "AbortError");
        buffer.timestampOffset = timestamp;
        const current = buffer;
        await wait(current, "updateend", controller.signal, () =>
          current.appendBuffer(part.bytes),
        );
        timestamp += part.frames / contract.frameRate;
      }
      source.endOfStream();
    } catch (error) {
      dispose();
      throw error;
    }
  })();
  void ready.catch(() => {});
  return { url, ready, dispose };
}
