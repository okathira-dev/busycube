export const compressionFormats = ["gzip", "deflate", "deflate-raw"] as const;
export type ParcelFormat = (typeof compressionFormats)[number];
export class UnsupportedCompressionError extends Error {}
const permutations: readonly (readonly ParcelFormat[])[] = [
  ["gzip", "deflate", "deflate-raw"],
  ["gzip", "deflate-raw", "deflate"],
  ["deflate", "gzip", "deflate-raw"],
  ["deflate", "deflate-raw", "gzip"],
  ["deflate-raw", "gzip", "deflate"],
  ["deflate-raw", "deflate", "gzip"],
];

async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const reader = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(stream)
    .getReader();
  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      length += value.byteLength;
      if (length > 65_536) {
        await reader.cancel();
        throw new Error("Parcel too large");
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function createParcels(
  signal: AbortSignal,
  previous?: readonly ParcelFormat[],
) {
  signal.throwIfAborted();
  if (
    typeof CompressionStream === "undefined" ||
    typeof DecompressionStream === "undefined"
  )
    throw new UnsupportedCompressionError();
  const options = permutations.filter(
    (candidate) =>
      !previous || candidate.some((format, i) => format !== previous[i]),
  );
  const formats = options[Math.floor(Math.random() * options.length)];
  if (!formats) throw new Error("No parcel assignment");
  const parcels = await Promise.all(
    formats.map(async (format) => {
      let compressor: CompressionStream;
      let decompressor: DecompressionStream;
      try {
        compressor = new CompressionStream(format);
        decompressor = new DecompressionStream(format);
      } catch (error) {
        if (error instanceof TypeError) throw new UnsupportedCompressionError();
        throw error;
      }
      const random = crypto.getRandomValues(new Uint8Array(1024));
      const original = new TextEncoder().encode(
        Array.from(random, (value) => value.toString(16).padStart(2, "0")).join(
          "",
        ),
      );
      const compressed = await transform(original, compressor, signal);
      const restored = await transform(compressed, decompressor, signal);
      if (
        restored.length !== original.length ||
        restored.some((value, i) => value !== original[i])
      )
        throw new Error("Parcel roundtrip failed");
      return new Blob([compressed], { type: "application/octet-stream" });
    }),
  );
  signal.throwIfAborted();
  return { formats, parcels };
}
