export const thresholds = [5, 25, 100] as const;
export const radii = [90, 175, 260] as const;
export const anchorKey = "busycube:S-590:anchor";
const anchorLifetime = 86_400_000;
export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}
export interface Anchor extends LocationFix {
  at: number;
}

export function validFix(value: LocationFix) {
  return (
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180 &&
    Number.isFinite(value.accuracy) &&
    value.accuracy >= 0
  );
}

export function storedAnchor(text: string | null, now: number): Anchor | null {
  try {
    const value: unknown = JSON.parse(text ?? "null");
    if (
      !value ||
      typeof value !== "object" ||
      !("latitude" in value) ||
      typeof value.latitude !== "number" ||
      !("longitude" in value) ||
      typeof value.longitude !== "number" ||
      !("accuracy" in value) ||
      typeof value.accuracy !== "number" ||
      !("at" in value) ||
      typeof value.at !== "number"
    )
      return null;
    const anchor = {
      latitude: value.latitude,
      longitude: value.longitude,
      accuracy: value.accuracy,
      at: value.at,
    };
    return validFix(anchor) &&
      Number.isFinite(anchor.at) &&
      anchor.at <= now &&
      now - anchor.at < anchorLifetime
      ? anchor
      : null;
  } catch {
    return null;
  }
}

export function conservativeDistance(a: LocationFix, b: LocationFix) {
  if (!validFix(a) || !validFix(b)) return null;
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLon = (b.longitude - a.longitude) * radians;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * radians) *
      Math.cos(b.latitude * radians) *
      Math.sin(dLon / 2) ** 2;
  const bounded = Math.max(0, Math.min(1, haversine));
  const distance =
    6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
  return Math.max(0, distance - a.accuracy - b.accuracy);
}

// 各しきい値を対応する円へ正確に写す区分線形の尺度。方角は表さない。
export function distanceRadius(meters: number) {
  if (meters <= 5) return (Math.max(0, meters) / 5) * 90;
  if (meters <= 25) return 90 + ((meters - 5) / 20) * 85;
  if (meters <= 100) return 175 + ((meters - 25) / 75) * 85;
  return 260 + Math.min(20, (meters - 100) / 5);
}
