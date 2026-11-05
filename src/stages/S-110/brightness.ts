export const darkThreshold = 34;
export const brightThreshold = 204;
export function meanCameraRgb(pixels: ArrayLike<number>) {
  if (!pixels.length || pixels.length % 4 !== 0) return;
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    if (
      r === undefined ||
      g === undefined ||
      b === undefined ||
      ![r, g, b].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 255,
      )
    )
      return;
    total += (r + g + b) / 3;
  }
  return total / (pixels.length / 4);
}
