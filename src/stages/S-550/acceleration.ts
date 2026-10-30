// 数値の再調整は未合意。旧値を暫定維持し、採用済みのしきい値とは扱わない。
export const provisionalThreshold = 2;

export function accelerationMagnitude(values: readonly (number | null)[]) {
  if (
    values.length !== 3 ||
    !values.every(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    )
  )
    return null;
  const magnitude = Math.hypot(...values);
  return Number.isFinite(magnitude) ? magnitude : null;
}

export function reachesTarget(magnitude: number | null) {
  return (
    magnitude !== null &&
    Number.isFinite(magnitude) &&
    magnitude >= 0 &&
    magnitude <= provisionalThreshold
  );
}
