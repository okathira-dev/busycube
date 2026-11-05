import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jsQR from "jsqr";
import { makeQrMatrix } from "./lib/qrMatrix.mjs";

const runFile = promisify(execFile);
const ffmpeg = process.env.BUSYCUBE_FFMPEG_PATH;
if (!ffmpeg)
  throw new Error("Set BUSYCUBE_FFMPEG_PATH to a trusted FFmpeg executable.");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = resolve(root, "src/fixtures/s700/assets");
const temporaryRoot = await mkdtemp(resolve(tmpdir(), "busycube-s700-"));
const width = 640;
const height = 360;
const qrSize = 25;
const slots = [
  { id: "a", key: "silver orbit", token: "bcu-rp-a-7k3m2q" },
  { id: "b", key: "quiet prism", token: "bcu-rp-b-9x4v6n" },
  { id: "c", key: "amber signal", token: "bcu-rp-c-2h8w5r" },
  { id: "d", key: "violet harbor", token: "bcu-rp-d-6p3y9t" },
];

const alphabet = {
  a: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  b: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  d: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  e: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  g: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  h: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  i: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  l: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  m: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  n: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  o: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  p: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  r: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  s: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  t: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  u: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  v: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
};

function blankFrame(value) {
  return new Uint8Array(width * height * 3).fill(value);
}

function setPixel(frame, x, y, value) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = (y * width + x) * 3;
  frame[offset] = value;
  frame[offset + 1] = value;
  frame[offset + 2] = value;
}

function textFrame(text) {
  const frame = blankFrame(8);
  const scale = 10;
  const characterWidth = 6 * scale;
  const left = Math.floor((width - (text.length * characterWidth - scale)) / 2);
  const top = Math.floor((height - 7 * scale) / 2);
  for (const [characterIndex, character] of [...text].entries()) {
    const pattern = character === " " ? undefined : alphabet[character];
    if (!pattern) continue;
    for (const [row, line] of pattern.entries()) {
      for (const [column, bit] of [...line].entries()) {
        if (bit !== "1") continue;
        for (let y = 0; y < scale; y += 1)
          for (let x = 0; x < scale; x += 1)
            setPixel(
              frame,
              left + characterIndex * characterWidth + column * scale + x,
              top + row * scale + y,
              248,
            );
      }
    }
  }
  return frame;
}

function qrFrame(token) {
  const frame = blankFrame(255);
  const matrix = makeQrMatrix(token);
  const moduleSize = 10;
  const quiet = 4;
  const size = (qrSize + quiet * 2) * moduleSize;
  const left = Math.floor((width - size) / 2);
  const top = Math.floor((height - size) / 2);
  for (let row = 0; row < qrSize; row += 1) {
    for (let column = 0; column < qrSize; column += 1) {
      if (!matrix[row][column]) continue;
      for (let y = 0; y < moduleSize; y += 1)
        for (let x = 0; x < moduleSize; x += 1)
          setPixel(
            frame,
            left + (column + quiet) * moduleSize + x,
            top + (row + quiet) * moduleSize + y,
            0,
          );
    }
  }
  return frame;
}

async function writePpm(path, pixels) {
  await writeFile(
    path,
    Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]),
  );
}

try {
  await mkdir(assetRoot, { recursive: true });
  const assets = [];
  for (const slot of slots) {
    const keyFrame = resolve(temporaryRoot, `${slot.id}-key.ppm`);
    const qr = resolve(temporaryRoot, `${slot.id}-qr.ppm`);
    const output = resolve(assetRoot, `remote-slot-${slot.id}.webm`);
    await writePpm(keyFrame, textFrame(slot.key));
    await writePpm(qr, qrFrame(slot.token));
    await runFile(
      ffmpeg,
      [
        "-y",
        "-loop",
        "1",
        "-framerate",
        "12",
        "-t",
        "4",
        "-i",
        keyFrame,
        "-loop",
        "1",
        "-framerate",
        "12",
        "-t",
        "4",
        "-i",
        qr,
        "-filter_complex",
        "[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]",
        "-map",
        "[v]",
        "-c:v",
        "libvpx-vp9",
        "-deadline",
        "good",
        "-b:v",
        "220k",
        "-an",
        output,
      ],
      { windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
    const { stdout: decodedFrame } = await runFile(
      ffmpeg,
      [
        "-v",
        "error",
        "-ss",
        "6",
        "-i",
        output,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-",
      ],
      {
        windowsHide: true,
        maxBuffer: width * height * 4 + 1024,
        encoding: "buffer",
      },
    );
    const rgba = new Uint8ClampedArray(
      decodedFrame.buffer,
      decodedFrame.byteOffset,
      decodedFrame.byteLength,
    );
    const decoded = jsQR(rgba, width, height, {
      inversionAttempts: "dontInvert",
    });
    if (decoded?.data !== slot.token)
      throw new Error(
        `Generated QR did not survive VP9 encoding for slot ${slot.id}.`,
      );
    const bytes = await readFile(output);
    if (!bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
      throw new Error(`Generated slot ${slot.id} is not a WebM file.`);
    assets.push(slot);
  }
  await writeFile(
    resolve(assetRoot, "remote-playback-fixtures.json"),
    `${JSON.stringify({ assets }, null, 2)}\n`,
  );
  console.log(`Generated ${assets.length} S-700 Remote Playback fixtures.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
