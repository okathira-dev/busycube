import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { expect, test } from "vitest";

test("PoCの圧縮ファイルは正本と同じgzipで、展開後の問題データを保つ", () => {
  const copy = readFileSync(
    new URL("../../public/poc/parcel-a.compressed", import.meta.url),
  );
  const canonical = readFileSync(
    new URL("../fixtures/s880/assets/parcel-a.gz", import.meta.url),
  );
  expect(copy.equals(canonical)).toBe(true);
  const payload = gunzipSync(copy);
  expect(payload.byteLength).toBe(65536);
  expect(payload.toString("utf8")).toContain("marker=pocket compass");
});
