import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const executable = process.env.BUSYCUBE_FFMPEG_PATH;
if (!executable)
  throw new Error("Set BUSYCUBE_FFMPEG_PATH to a trusted ffmpeg executable.");
const run = promisify(execFile);
const directory = resolve(import.meta.dirname, "../src/stages/S-430/assets");
await mkdir(directory, { recursive: true });
for (const [name, frequency, color] of [
  ["wave-a", 220, "a78bfa"],
  ["wave-b", 330, "34d399"],
]) {
  await run(
    executable,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=${frequency}:sample_rate=48000:duration=45`,
      "-filter_complex",
      `[0:a]asplit=2[listen][wave];[listen]volume=0.2[audio];[wave]showwaves=s=320x180:mode=line:rate=15:colors=0x${color}:scale=cbrt,format=yuv420p[video]`,
      "-map",
      "[video]",
      "-map",
      "[audio]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "27",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "48k",
      "-ac",
      "1",
      "-map_metadata",
      "-1",
      "-movflags",
      "+faststart",
      "-shortest",
      "-y",
      resolve(directory, `${name}.mp4`),
    ],
    { windowsHide: true },
  );
}
