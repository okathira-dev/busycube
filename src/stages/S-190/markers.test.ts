import { readFileSync } from "node:fs";
import { readMarkers } from "./markers";

function frame(names: string[]) {
  const width = Math.max(1, names.length) * 300;
  const data = new Uint8ClampedArray(width * 300 * 4).fill(255);
  for (const [index, name] of names.entries()) {
    const svg = readFileSync(`public/stage-capture-${name}.svg`, "utf8");
    for (const match of svg.matchAll(/M(\d+),(\d+)h1v1h-1z/g)) {
      const left = Number(match[1]) * 8 + index * 300;
      const top = Number(match[2]) * 8;
      for (let y = top; y < top + 8; y++)
        for (let x = left; x < left + 8; x++)
          data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
  }
  return { data, width, height: 300, colorSpace: "srgb" as const };
}
it("decodes each actual shipped SVG and both symbols in one frame in either order", () => {
  for (const names of [
    ["inside"],
    ["outside"],
    ["inside", "outside"],
    ["outside", "inside"],
  ]) {
    const pixels = frame(names);
    const before = new Uint8ClampedArray(pixels.data);
    expect(readMarkers(pixels).sort()).toEqual([...names].sort());
    expect(Buffer.compare(Buffer.from(pixels.data), Buffer.from(before))).toBe(
      0,
    );
  }
});
it("does not accept blank or arbitrary four-colour pixels", () => {
  const pixels = frame([]);
  expect(readMarkers(pixels)).toEqual([]);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const colours = [
      [0, 255, 255],
      [255, 0, 255],
      [255, 255, 0],
      [0, 0, 0],
    ];
    const colour = colours[Math.floor(i / 900) % 4];
    if (colour) pixels.data.set(colour, i);
  }
  expect(readMarkers(pixels)).toEqual([]);
});
