export type Axis = "x" | "y" | "z";
export const axes = ["x", "y", "z"] as const;
export interface AxisState {
  value: number | null;
  negative: boolean;
  positive: boolean;
}
export const initialAxis = (): AxisState => ({
  value: null,
  negative: false,
  positive: false,
});
export function observeAxis(
  previous: AxisState,
  value: number | null,
): AxisState {
  const reading =
    typeof value === "number" && Number.isFinite(value) ? value : null;
  return {
    value: reading,
    negative: previous.negative || (reading !== null && reading <= -50),
    positive: previous.positive || (reading !== null && reading >= 50),
  };
}
