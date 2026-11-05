import { gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { createParcels, UnsupportedCompressionError } from "./parcels";

describe("generated external compression questions", () => {
  it("creates three real formats, verifies them and changes assignment and contents after a retry", async () => {
    const signal = new AbortController().signal;
    const first = await createParcels(signal);
    const second = await createParcels(signal, first.formats);
    expect(new Set(first.formats)).toEqual(
      new Set(["gzip", "deflate", "deflate-raw"]),
    );
    expect(second.formats).not.toEqual(first.formats);
    const decode = {
      gzip: gunzipSync,
      deflate: inflateSync,
      "deflate-raw": inflateRawSync,
    };
    const texts: string[] = [];
    for (const round of [first, second]) {
      for (const [index, blob] of round.parcels.entries()) {
        const format = round.formats[index];
        if (!format) throw new Error("Missing format");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        expect(blob.type).toBe("application/octet-stream");
        const text = decode[format](bytes).toString("utf8");
        expect(text).toMatch(/^[0-9a-f]{2048}$/);
        texts.push(text);
      }
    }
    expect(new Set(texts).size).toBe(6);
  });
  it("does not return a question on abort or missing API", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createParcels(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    vi.stubGlobal("CompressionStream", undefined);
    try {
      await expect(
        createParcels(new AbortController().signal),
      ).rejects.toBeInstanceOf(UnsupportedCompressionError);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
