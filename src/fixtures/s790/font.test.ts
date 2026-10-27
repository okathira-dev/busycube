import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import contract from "./assets/font-contract.json";

it("ships an internally consistent font with four distinct nonempty private-use outlines and matching contract", () => {
  const bytes = readFileSync(
    new URL("./assets/busycube-key.ttf", import.meta.url),
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    contract.sha256,
  );
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 4)
    sum = (sum + bytes.readUInt32BE(i)) >>> 0;
  expect(sum).toBe(0xb1b0afba);
  const tables = new Map<string, Buffer>();
  for (let i = 0; i < bytes.readUInt16BE(4); i++) {
    const record = 12 + i * 16,
      offset = bytes.readUInt32BE(record + 8),
      length = bytes.readUInt32BE(record + 12);
    expect(offset + length).toBeLessThanOrEqual(bytes.length);
    tables.set(
      bytes.toString("ascii", record, record + 4),
      bytes.subarray(offset, offset + length),
    );
  }
  const cmap = tables.get("cmap"),
    loca = tables.get("loca"),
    glyf = tables.get("glyf");
  expect(cmap && loca && glyf).toBeTruthy();
  if (!cmap || !loca || !glyf) throw new Error("Missing font tables");
  const sub = cmap.subarray(cmap.readUInt32BE(8)),
    segments = sub.readUInt16BE(6) / 2;
  const glyphs = [...contract.text].map((char) => {
    const code = char.codePointAt(0) ?? 0;
    for (let i = 0; i < segments; i++) {
      const end = sub.readUInt16BE(14 + i * 2),
        start = sub.readUInt16BE(16 + segments * 2 + i * 2);
      if (start <= code && code <= end) {
        expect(sub.readUInt16BE(16 + segments * 6 + i * 2)).toBe(0);
        const index =
          (code + sub.readInt16BE(16 + segments * 4 + i * 2)) & 0xffff;
        const begin = loca.readUInt16BE(index * 2) * 2,
          finish = loca.readUInt16BE((index + 1) * 2) * 2;
        expect(finish).toBeGreaterThan(begin);
        expect(glyf.readInt16BE(begin)).toBeGreaterThan(0);
        return glyf.subarray(begin, finish).toString("hex");
      }
    }
    throw new Error("Unmapped phrase glyph");
  });
  expect(new Set(glyphs).size).toBe(4);
  expect(
    tables
      .get("name")
      ?.includes(Buffer.from(contract.postscriptName, "utf16le").swap16()),
  ).toBe(true);
});
