import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const width = 240;
const height = 120;
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, body, checksum]);
}
function image(kind) {
  const pixels = Buffer.alloc(width * height * 4);
  const point = (x, y, color = [238, 242, 255]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = 255;
  };
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) point(x, y, [24, 19, 41]);
  const line = (x1, y1, x2, y2, color, thickness = 3) => {
    const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let step = 0; step <= length; step += 1) {
      const x = Math.round(x1 + ((x2 - x1) * step) / length);
      const y = Math.round(y1 + ((y2 - y1) * step) / length);
      for (let dy = -thickness; dy <= thickness; dy += 1)
        for (let dx = -thickness; dx <= thickness; dx += 1)
          point(x + dx, y + dy, color);
    }
  };
  if (kind !== "window") {
    for (const [x1, y1, x2, y2] of [
      [42, 76, 42, 38],
      [42, 38, 82, 38],
      [82, 38, 82, 76],
      [82, 76, 42, 76],
      [80, 59, 167, 59],
      [151, 43, 167, 59],
      [151, 75, 167, 59],
      [171, 34, 205, 34],
      [205, 34, 205, 84],
      [205, 84, 171, 84],
    ])
      line(x1, y1, x2, y2, undefined, 2);
    for (const [x1, y1, x2, y2] of [
      [92, 72, 92, 103],
      [92, 72, 112, 93],
      [92, 103, 100, 96],
      [100, 96, 107, 109],
    ])
      line(x1, y1, x2, y2, undefined, 2);
    if (kind === "file") {
      for (let angle = 0; angle < 360; angle += 1)
        point(
          Math.round(120 + 48 * Math.cos((angle * Math.PI) / 180)),
          Math.round(60 + 48 * Math.sin((angle * Math.PI) / 180)),
          [251, 113, 133],
        );
      line(86, 26, 154, 94, [251, 113, 133], 3);
    }
  } else {
    const letters = {
      i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
      f: ["00110", "01000", "11100", "01000", "01000", "01000", "01000"],
      r: ["00000", "00000", "10110", "11000", "10000", "10000", "10000"],
      a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
      m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
      e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
    };
    for (const [index, letter] of [..."iframe"].entries())
      for (const [y, row] of letters[letter].entries())
        for (const [x, pixel] of [...row].entries())
          if (pixel === "1") {
            for (let dy = 0; dy < 5; dy += 1)
              for (let dx = 0; dx < 5; dx += 1)
                point(30 + index * 30 + x * 5 + dx, 40 + y * 5 + dy);
          }
  }
  const rows = [];
  for (let y = 0; y < height; y += 1)
    rows.push(
      Buffer.concat([
        Buffer.from([0]),
        pixels.subarray(y * width * 4, (y + 1) * width * 4),
      ]),
    );
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const contract = {};
for (const kind of ["page", "file", "window"]) {
  const bytes = image(kind);
  const filename = `stage-drag-${kind}.png`;
  await writeFile(resolve(root, "public", filename), bytes);
  contract[kind] = {
    filename,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
await writeFile(
  resolve(root, "src/fixtures/stage-drag-contract.json"),
  `${JSON.stringify(contract, null, 2)}\n`,
);
