export const fullTurn = Math.PI * 2;
// 60 Hz観測の長い欠落を回転として推定しない。中断前の累積角は保持する。
export const maximumGapMs = 250;
export type Rotation = {
  angle: number;
  previous: { rate: number; timestamp: number } | null;
};
export const initialRotation = (): Rotation => ({ angle: 0, previous: null });

export function observeRotation(
  state: Rotation,
  rate: number | null,
  timestamp: number | null,
): Rotation {
  if (
    rate === null ||
    timestamp === null ||
    !Number.isFinite(rate) ||
    !Number.isFinite(timestamp) ||
    timestamp < 0
  )
    return { angle: state.angle, previous: null };
  const previous = { rate, timestamp };
  if (!state.previous) return { angle: state.angle, previous };
  const elapsed = timestamp - state.previous.timestamp;
  if (elapsed <= 0) return state;
  if (elapsed > maximumGapMs) return { angle: state.angle, previous };
  const angle =
    state.angle + ((state.previous.rate / 2 + rate / 2) * elapsed) / 1000;
  return Number.isFinite(angle)
    ? { angle, previous }
    : { angle: state.angle, previous: null };
}

export function completesTurn(angle: number) {
  return Number.isFinite(angle) && Math.abs(angle) >= fullTurn;
}
