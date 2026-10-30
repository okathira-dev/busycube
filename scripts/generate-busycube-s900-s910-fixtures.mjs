import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const ffmpeg = process.env.BUSYCUBE_FFMPEG_PATH;
const ffprobe = process.env.BUSYCUBE_FFPROBE_PATH;
if (!ffmpeg || !ffprobe) {
  throw new Error(
    "Set BUSYCUBE_FFMPEG_PATH and BUSYCUBE_FFPROBE_PATH to trusted local executables.",
  );
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const s900Root = resolve(root, "src/fixtures/s900/assets");
const s910Root = resolve(root, "src/fixtures/s910/assets");
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "busycube-s900-s910-fixture-"),
);
const width = 640;
const height = 360;
const frameRate = 15;

async function run(executable, args) {
  return runFile(executable, args, {
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function createFrame(background) {
  const pixels = new Uint8Array(width * height * 3);
  for (let offset = 0; offset < pixels.length; offset += 3) {
    pixels[offset] = background[0];
    pixels[offset + 1] = background[1];
    pixels[offset + 2] = background[2];
  }
  return pixels;
}

function setPixel(pixels, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (Math.floor(y) * width + Math.floor(x)) * 3;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
}

function fillRect(pixels, x, y, rectWidth, rectHeight, color) {
  const fromX = Math.max(0, Math.floor(x));
  const fromY = Math.max(0, Math.floor(y));
  const toX = Math.min(width, Math.ceil(x + rectWidth));
  const toY = Math.min(height, Math.ceil(y + rectHeight));
  for (let row = fromY; row < toY; row += 1) {
    for (let column = fromX; column < toX; column += 1)
      setPixel(pixels, column, row, color);
  }
}

function fillCircle(pixels, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSquared) setPixel(pixels, x, y, color);
    }
  }
}

function triangleSign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function fillTriangle(pixels, points, color) {
  const [[ax, ay], [bx, by], [cx, cy]] = points;
  const minX = Math.floor(Math.min(ax, bx, cx));
  const maxX = Math.ceil(Math.max(ax, bx, cx));
  const minY = Math.floor(Math.min(ay, by, cy));
  const maxY = Math.ceil(Math.max(ay, by, cy));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d1 = triangleSign(x, y, ax, ay, bx, by);
      const d2 = triangleSign(x, y, bx, by, cx, cy);
      const d3 = triangleSign(x, y, cx, cy, ax, ay);
      const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNegative && hasPositive)) setPixel(pixels, x, y, color);
    }
  }
}

function addFilmTexture(pixels, frameIndex) {
  for (let y = 12; y < height; y += 24) {
    const shade = (y + frameIndex) % 48 === 0 ? [24, 31, 49] : [18, 24, 40];
    fillRect(pixels, 0, y, width, 1, shade);
  }
  for (let x = -20 + ((frameIndex * 6) % 40); x < width; x += 40) {
    fillRect(pixels, x, 14, 18, 10, [55, 65, 86]);
    fillRect(pixels, x, height - 24, 18, 10, [55, 65, 86]);
  }
}

function createS900Frame(segmentId, frameIndex, frameCount) {
  const pixels = createFrame([12, 20, 32]);
  addFilmTexture(pixels, 0);
  const path = [
    [70, 75],
    [200, 120],
    [330, 165],
    [440, 215],
    [550, 270],
  ];
  const index = { lead: 0, A: 0, B: 1, C: 2, D: 3 }[segmentId];
  const p = segmentId === "lead" ? 0 : frameIndex / (frameCount - 1);
  const time = segmentId === "lead" ? 0 : index + p;
  for (let section = 0; section < 4; section++) {
    const [ax, ay] = path[section],
      [bx, by] = path[section + 1];
    for (let step = 0; step <= 250; step++) {
      const t = step / 250;
      fillCircle(
        pixels,
        Math.round(ax + (bx - ax) * t),
        Math.round(ay + (by - ay) * t) + 17,
        4,
        [90, 118, 148],
      );
    }
    fillRect(pixels, bx - 4, by + 25, 8, 310 - by, [45, 64, 87]);
  }
  // A turning wheel and its pin make the apparatus continuous across cuts.
  fillCircle(pixels, 330, 245, 39, [55, 80, 109]);
  fillCircle(pixels, 330, 245, 27, [12, 20, 32]);
  const angle = (time * Math.PI) / 2;
  fillCircle(
    pixels,
    Math.round(330 + Math.cos(angle) * 32),
    Math.round(245 + Math.sin(angle) * 32),
    6,
    [111, 211, 204],
  );
  const [ax, ay] = path[index],
    [bx, by] = path[index + 1];
  const ballX = ax + (bx - ax) * p;
  const ballY = ay + (by - ay) * p;
  fillCircle(pixels, Math.round(ballX), Math.round(ballY), 14, [255, 209, 92]);
  fillCircle(
    pixels,
    Math.round(ballX - 4),
    Math.round(ballY - 5),
    4,
    [255, 250, 211],
  );
  // The last reel drops the ball into the open gift; no text or order marks.
  fillRect(pixels, 520, 278, 75, 44, [159, 117, 224]);
  fillRect(pixels, 552, 278, 10, 44, [255, 212, 115]);
  fillRect(pixels, 510, 248, 80, 9, [159, 117, 224]);
  return pixels;
}
const s910Visuals = [
  { id: "circle", start: 0.4, end: 1.2 },
  { id: "triangle", start: 1.55, end: 2.35 },
  { id: "square", start: 2.7, end: 3.5 },
];

function createS910Frame(frameIndex) {
  const pixels = createFrame([8, 12, 22]);
  addFilmTexture(pixels, frameIndex);
  const time = frameIndex / frameRate;
  const active = s910Visuals.find(
    (visual) => time >= visual.start && time <= visual.end,
  )?.id;
  fillRect(pixels, 70, 298, 500, 4, [55, 65, 86]);
  fillRect(pixels, 70, 298, (500 * frameIndex) / 59, 4, [138, 180, 248]);
  if (active === "circle") fillCircle(pixels, 320, 175, 88, [225, 52, 74]);
  if (active === "triangle")
    fillTriangle(
      pixels,
      [
        [320, 72],
        [218, 260],
        [422, 260],
      ],
      [55, 125, 232],
    );
  if (active === "square") fillRect(pixels, 238, 93, 164, 164, [250, 204, 21]);
  return pixels;
}

async function writePpm(path, pixels) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`, "ascii");
  await writeFile(path, Buffer.concat([header, pixels]));
}

async function normalizeWebmTrackUid(path) {
  const bytes = await readFile(path);
  const normalized = Buffer.from(bytes);
  const deterministicUid = Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]);
  const elementIds = [
    [0x73, 0xc5],
    [0x63, 0xc5],
  ];
  const matches = new Map(elementIds.map((id) => [id.join("-"), 0]));
  for (let offset = 0; offset <= normalized.length - 11; offset += 1) {
    for (const id of elementIds) {
      if (
        normalized[offset] === id[0] &&
        normalized[offset + 1] === id[1] &&
        normalized[offset + 2] === 0x88
      ) {
        deterministicUid.copy(normalized, offset + 3);
        const key = id.join("-");
        matches.set(key, (matches.get(key) ?? 0) + 1);
      }
    }
  }
  if (elementIds.some((id) => matches.get(id.join("-")) !== 1))
    throw new Error(`Unexpected WebM TrackUID structure: ${path}`);
  await writeFile(path, normalized);
}

async function encodeVideo(name, frameCount, createPixels, destination) {
  const frameRoot = join(temporaryRoot, name);
  await mkdir(frameRoot, { recursive: true });
  for (let index = 0; index < frameCount; index += 1) {
    await writePpm(
      join(frameRoot, `frame-${String(index).padStart(3, "0")}.ppm`),
      createPixels(index, frameCount),
    );
  }
  await run(ffmpeg, [
    "-loglevel",
    "error",
    "-fflags",
    "+bitexact",
    "-framerate",
    String(frameRate),
    "-start_number",
    "0",
    "-i",
    join(frameRoot, "frame-%03d.ppm"),
    "-an",
    "-c:v",
    "libvpx",
    "-flags:v",
    "+bitexact",
    "-deadline",
    "good",
    "-cpu-used",
    "4",
    "-threads",
    "1",
    "-b:v",
    "500k",
    "-g",
    String(frameRate),
    "-pix_fmt",
    "yuv420p",
    "-map_metadata",
    "-1",
    "-y",
    destination,
  ]);
  // FFmpeg's WebM muxer randomizes TrackUID even in bitexact mode. Replace
  // the standard TrackUID and its tag target with the same deterministic
  // unsigned value so identical source frames produce byte-identical assets.
  await normalizeWebmTrackUid(destination);
}

async function inspectVideo(path) {
  const { stdout } = await run(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name,width,height,avg_frame_rate:format=duration",
    "-of",
    "json",
    path,
  ]);
  const result = JSON.parse(stdout);
  const stream = result.streams?.[0];
  if (!stream || result.format?.duration === undefined)
    throw new Error(`Could not inspect generated video: ${path}`);
  return {
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    averageFrameRate: stream.avg_frame_rate,
    durationSeconds: Number(result.format.duration),
  };
}

function assertVideoProbe(probe, durationSeconds) {
  if (
    probe.codec !== "vp8" ||
    probe.width !== width ||
    probe.height !== height ||
    probe.averageFrameRate !== `${frameRate}/1` ||
    Math.abs(probe.durationSeconds - durationSeconds) > 0.01
  ) {
    throw new Error(
      `Unexpected generated video metadata: ${JSON.stringify(probe)}`,
    );
  }
}

try {
  await Promise.all([
    mkdir(s900Root, { recursive: true }),
    mkdir(s910Root, { recursive: true }),
  ]);

  const s900Segments = {
    lead: { file: "lead.webm", frames: 8 },
    A: { file: "a.webm", frames: 30 },
    B: { file: "b.webm", frames: 30 },
    C: { file: "c.webm", frames: 30 },
    D: { file: "d.webm", frames: 30 },
  };
  for (const [id, segment] of Object.entries(s900Segments)) {
    const destination = resolve(s900Root, segment.file);
    await encodeVideo(
      `s900-${id}`,
      segment.frames,
      (index, count) => createS900Frame(id, index, count),
      destination,
    );
    assertVideoProbe(
      await inspectVideo(destination),
      segment.frames / frameRate,
    );
  }
  await writeFile(
    resolve(s900Root, "media-source-segments.json"),
    `${JSON.stringify(
      {
        mimeType: 'video/webm; codecs="vp8"',
        frameRate,
        leadIn: s900Segments.lead,
        reels: {
          A: s900Segments.A,
          B: s900Segments.B,
          C: s900Segments.C,
          D: s900Segments.D,
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (!process.argv.includes("--s900-only")) {
    const s910Asset = resolve(s910Root, "caption-stage.webm");
    await encodeVideo("s910-caption-stage", 60, createS910Frame, s910Asset);
    const s910Probe = await inspectVideo(s910Asset);
    assertVideoProbe(s910Probe, 4);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
