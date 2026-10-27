export interface AltitudeObservation {
  altitude: number;
  accuracy: number;
  low: number;
  high: number;
  band: 0 | 1 | 2 | null;
}

// 精度条件の最終採否は未確定。即時判定への変更と分け、既存の保守的条件を維持する。
export function observeAltitude(
  altitude: number | null,
  accuracy: number | null,
): AltitudeObservation | null {
  if (
    altitude === null ||
    accuracy === null ||
    !Number.isFinite(altitude) ||
    !Number.isFinite(accuracy) ||
    accuracy < 0
  )
    return null;
  const low = altitude - accuracy;
  const high = altitude + accuracy;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  const band =
    high < 100 ? 0 : low >= 100 && high < 500 ? 1 : low >= 500 ? 2 : null;
  return { altitude, accuracy, low, high, band };
}

// 100m/500mをそれぞれ三層の境界に写す。上下の範囲外は図の端で示す。
export function altitudeY(altitude: number) {
  if (altitude <= 100) return Math.min(380, 280 + (100 - altitude) / 2);
  if (altitude <= 500) return 280 - ((altitude - 100) * 140) / 400;
  return Math.max(40, 140 - (altitude - 500) / 5);
}
