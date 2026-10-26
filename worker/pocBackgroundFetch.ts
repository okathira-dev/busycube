export const POC_DOWNLOAD_BYTES = 64 * 1024;
const CHUNK_BYTES = 1024;
const INTERVAL_MS = 1400;

export function createPocDownload(request: Request): Response {
  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": 'attachment; filename="busycube-poc.bin"',
    "Cache-Control": "no-store, no-transform",
    "Accept-Ranges": "bytes",
  });
  let first = 0;
  let last = POC_DOWNLOAD_BYTES - 1;
  const range = request.headers.get("Range");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    first = Number(match?.[1] ?? NaN);
    last = match?.[2] ? Math.min(Number(match[2]), last) : last;
    if (
      !match ||
      !Number.isSafeInteger(first) ||
      !Number.isSafeInteger(last) ||
      first < 0 ||
      first > last ||
      first >= POC_DOWNLOAD_BYTES
    ) {
      headers.set("Content-Range", `bytes */${POC_DOWNLOAD_BYTES}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set(
      "Content-Range",
      `bytes ${first}-${last}/${POC_DOWNLOAD_BYTES}`,
    );
  }
  headers.set("Content-Length", String(last - first + 1));
  const responseStatus = range ? 206 : 200;
  if (request.method === "HEAD")
    return new Response(null, { status: responseStatus, headers });

  const suppliedTrial = new URL(request.url).searchParams.get("trial") ?? "";
  const trial = /^[a-z0-9-]{1,80}$/i.test(suppliedTrial)
    ? suppliedTrial
    : "probe";
  const startedAt = Date.now();
  let offset = first;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const stop = (event: string) => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    if (abortListener)
      request.signal.removeEventListener("abort", abortListener);
    console.info(
      "[S960 server]",
      JSON.stringify({
        event,
        trial,
        sentBytes: offset - first,
        elapsedMs: Date.now() - startedAt,
      }),
    );
  };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      abortListener = () => {
        stop("request-aborted");
        controller.error(new DOMException("Request aborted", "AbortError"));
      };
      if (request.signal.aborted) {
        abortListener();
        return;
      }
      request.signal.addEventListener("abort", abortListener, { once: true });
      console.info(
        "[S960 server]",
        JSON.stringify({ event: "stream-start", trial, first, last }),
      );
      const send = () => {
        if (stopped) return;
        try {
          const length = Math.min(CHUNK_BYTES, last - offset + 1);
          const chunk = Uint8Array.from(
            { length },
            (_, index) => (offset + index) % 251,
          );
          controller.enqueue(chunk);
          offset += length;
          if (offset > last) {
            controller.close();
            stop("stream-complete");
          } else timer = setTimeout(send, INTERVAL_MS);
        } catch (error) {
          stop("stream-error");
          controller.error(error);
        }
      };
      send();
    },
    cancel() {
      stop("client-cancelled");
    },
  });
  return new Response(body, { status: responseStatus, headers });
}
