import type { Level } from "./game";

const names = [
  "sora",
  "mikan",
  "kuma",
  "luna",
  "nagi",
  "pico",
  "tora",
  "riku",
] as const;
export function createOpponent(avoid: readonly string[] = []): string {
  const random = crypto.getRandomValues(new Uint32Array(2));
  const name = names[(random[0] ?? 0) % names.length] ?? names[0];
  let digits = (random[1] ?? 0) % 10_000;
  let result = `${name}_${String(digits).padStart(4, "0")}`;
  while (avoid.includes(result)) {
    digits = (digits + 1) % 10_000;
    result = `${name}_${String(digits).padStart(4, "0")}`;
  }
  return result;
}
export function isLevel(value: unknown): value is Level {
  return value === "easy" || value === "medium" || value === "hard";
}
export function isOpponent(value: unknown): value is string {
  return typeof value === "string" && /^[a-z]+_\d{4}$/.test(value);
}
