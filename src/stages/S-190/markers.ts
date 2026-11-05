import jsQR from "jsqr";
import markers from "../../fixtures/stage-capture-markers.json";

export type Marker = keyof typeof markers;

/** Work on a private buffer: erase each decoded symbol to find another in the same frame. */
export function readMarkers(frame: ImageData): Marker[] {
  const pixels = new Uint8ClampedArray(frame.data);
  const found = new Set<Marker>();
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = jsQR(pixels, frame.width, frame.height);
    if (!code) break;
    for (const kind of ["inside", "outside"] as const)
      if (code.data === markers[kind]) found.add(kind);
    const corners = [
      code.location.topLeftCorner,
      code.location.topRightCorner,
      code.location.bottomLeftCorner,
      code.location.bottomRightCorner,
    ];
    const left = Math.max(
      0,
      Math.floor(Math.min(...corners.map((p) => p.x))) - 2,
    );
    const right = Math.min(
      frame.width,
      Math.ceil(Math.max(...corners.map((p) => p.x))) + 2,
    );
    const top = Math.max(
      0,
      Math.floor(Math.min(...corners.map((p) => p.y))) - 2,
    );
    const bottom = Math.min(
      frame.height,
      Math.ceil(Math.max(...corners.map((p) => p.y))) + 2,
    );
    for (let y = top; y < bottom; y++)
      pixels.fill(
        255,
        (y * frame.width + left) * 4,
        (y * frame.width + right) * 4,
      );
  }
  return [...found];
}
