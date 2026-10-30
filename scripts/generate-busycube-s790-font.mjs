import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = resolve(root, "src/fixtures/s790/assets");
const outputPath = resolve(assetRoot, "busycube-key.ttf");

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value & 0xffff);
  return buffer;
}

function i16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16BE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function fixed(value) {
  return u32(Math.round(value * 65536));
}

function pad4(buffer) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding === 0
    ? buffer
    : Buffer.concat([buffer, Buffer.alloc(padding)]);
}

function checksum(buffer) {
  const padded = pad4(buffer);
  let sum = 0;
  for (let offset = 0; offset < padded.length; offset += 4) {
    sum = (sum + padded.readUInt32BE(offset)) >>> 0;
  }
  return sum;
}

function makeNameTable() {
  const names = [
    [1, "Busycube Key Two"],
    [2, "Regular"],
    [3, "Busycube Key Two 2.0"],
    [4, "Busycube Key Two Regular"],
    [5, "Version 2.000"],
    [6, "BusycubeKeyTwo-Regular"],
  ];
  const strings = names.map(([, value]) =>
    Buffer.from(value, "utf16le").swap16(),
  );
  const records = [];
  let offset = 0;
  for (const [[nameId], string] of names.map((item, index) => [
    item,
    strings[index],
  ])) {
    records.push(
      Buffer.concat([
        u16(3),
        u16(1),
        u16(0x0409),
        u16(nameId),
        u16(string.length),
        u16(offset),
      ]),
    );
    offset += string.length;
  }
  return Buffer.concat([
    u16(0),
    u16(records.length),
    u16(6 + records.length * 12),
    ...records,
    ...strings,
  ]);
}

const patterns = [
  ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
];
function makeCmapTable() {
  const codes = [0x20, 0xe001, 0xe002, 0xe003, 0xe004, 0xffff];
  const count = codes.length;
  const search = 2 ** Math.floor(Math.log2(count));
  const format4 = Buffer.concat([
    u16(4),
    u16(16 + count * 8),
    u16(0),
    u16(count * 2),
    u16(search * 2),
    u16(Math.log2(search)),
    u16(count * 2 - search * 2),
    ...codes.map(u16),
    u16(0),
    ...codes.map(u16),
    ...codes.map((code, index) =>
      u16((index === count - 1 ? 0 : index + 1) - code),
    ),
    ...codes.map(() => u16(0)),
  ]);
  return Buffer.concat([u16(0), u16(1), u16(3), u16(1), u32(12), format4]);
}
function makeGlyph(pattern) {
  const points = [];
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 5; x++) {
      if (pattern[y][x] !== "1") continue;
      const left = 100 + x * 140,
        bottom = 100 + (6 - y) * 100;
      // Clockwise outer contours. Adjacent cells meet to form block letters.
      points.push(
        [left, bottom],
        [left, bottom + 100],
        [left + 140, bottom + 100],
        [left + 140, bottom],
      );
    }
  return Buffer.concat([
    i16(points.length / 4),
    i16(100),
    i16(100),
    i16(800),
    i16(800),
    ...Array.from({ length: points.length / 4 }, (_, i) => u16(i * 4 + 3)),
    u16(0),
    Buffer.alloc(points.length, 1),
    ...points.map(([x], i) => i16(x - (points[i - 1]?.[0] ?? 0))),
    ...points.map(([, y], i) => i16(y - (points[i - 1]?.[1] ?? 0))),
  ]);
}
function makeOs2Table() {
  const panose = Buffer.from([2, 0, 5, 3, 0, 0, 0, 0, 0, 0]);
  return Buffer.concat([
    u16(0),
    i16(833),
    u16(400),
    u16(5),
    u16(0),
    i16(650),
    i16(600),
    i16(0),
    i16(75),
    i16(650),
    i16(600),
    i16(0),
    i16(350),
    i16(50),
    i16(250),
    i16(0),
    panose,
    u32(1),
    u32(0x10000000),
    u32(0),
    u32(0),
    Buffer.from("BBKY", "ascii"),
    u16(0x0040),
    u16(0x0020),
    u16(0xe000),
    i16(850),
    i16(-150),
    i16(0),
    u16(850),
    u16(150),
  ]);
}

function buildFont() {
  const glyphs = patterns.map((pattern) => pad4(makeGlyph(pattern)));
  const glyph = Buffer.concat(glyphs);
  const offsets = [0, 0, 0];
  for (const part of glyphs) offsets.push(offsets.at(-1) + part.length);
  const head = Buffer.concat([
    fixed(1),
    fixed(1),
    u32(0),
    u32(0x5f0f3cf5),
    u16(0x000b),
    u16(1000),
    Buffer.alloc(16),
    i16(0),
    i16(0),
    i16(850),
    i16(850),
    u16(0),
    u16(8),
    i16(2),
    i16(0),
    i16(0),
  ]);
  const hhea = Buffer.concat([
    fixed(1),
    i16(850),
    i16(-150),
    i16(0),
    u16(1000),
    i16(0),
    i16(0),
    i16(850),
    i16(1),
    i16(0),
    i16(0),
    Buffer.alloc(8),
    i16(0),
    u16(6),
  ]);
  const maxp = Buffer.concat([
    fixed(1),
    u16(6),
    u16(140),
    u16(35),
    u16(0),
    u16(0),
    u16(2),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
  ]);
  const post = Buffer.concat([
    fixed(3),
    fixed(0),
    i16(-100),
    i16(50),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
  ]);
  const tables = new Map([
    ["OS/2", makeOs2Table()],
    ["cmap", makeCmapTable()],
    ["glyf", glyph],
    ["head", head],
    ["hhea", hhea],
    [
      "hmtx",
      Buffer.concat(
        Array.from({ length: 6 }, () => Buffer.concat([u16(900), i16(0)])),
      ),
    ],
    ["loca", Buffer.concat(offsets.map((offset) => u16(offset / 2)))],
    ["maxp", maxp],
    ["name", makeNameTable()],
    ["post", post],
  ]);
  const tags = [...tables.keys()].sort();
  const numTables = tags.length;
  const searchRange = 16 * 2 ** Math.floor(Math.log2(numTables));
  const entrySelector = Math.floor(Math.log2(numTables));
  const directoryLength = 12 + numTables * 16;
  let tableOffset = directoryLength;
  const records = [];
  const chunks = [];
  let headOffset = 0;
  for (const tag of tags) {
    const table = tables.get(tag);
    const padded = pad4(table);
    records.push(
      Buffer.concat([
        Buffer.from(tag, "ascii"),
        u32(checksum(table)),
        u32(tableOffset),
        u32(table.length),
      ]),
    );
    if (tag === "head") headOffset = tableOffset;
    chunks.push(padded);
    tableOffset += padded.length;
  }
  const font = Buffer.concat([
    u32(0x00010000),
    u16(numTables),
    u16(searchRange),
    u16(entrySelector),
    u16(numTables * 16 - searchRange),
    ...records,
    ...chunks,
  ]);
  const adjustment = (0xb1b0afba - checksum(font)) >>> 0;
  font.writeUInt32BE(adjustment, headOffset + 8);
  if (checksum(font) !== 0xb1b0afba)
    throw new Error("OpenType checksum adjustment failed");
  return font;
}

await mkdir(assetRoot, { recursive: true });
const font = buildFont();
await writeFile(outputPath, font);
const sha256 = createHash("sha256").update(font).digest("hex");
await writeFile(
  resolve(assetRoot, "font-contract.json"),
  `${JSON.stringify(
    {
      postscriptName: "BusycubeKeyTwo-Regular",
      glyphs: ["U+E001", "U+E002", "U+E003", "U+E004"],
      text: "\uE001\uE002\uE003\uE004",
      answer: "CUBE",
      sha256,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Generated Busycube Key Two font (${font.length} bytes, ${sha256}).`,
);
