export const requiredGamepadInputs = [
  "up",
  "left",
  "down",
  "right",
  "ls-up",
  "ls-left",
  "ls-down",
  "ls-right",
  "rs-up",
  "rs-left",
  "rs-down",
  "rs-right",
  "face-top",
  "face-left",
  "face-bottom",
  "face-right",
  "L",
  "R",
  "ZL",
  "ZR",
  "L3",
  "R3",
  "select",
  "start",
] as const;

export type PadInput = (typeof requiredGamepadInputs)[number];

const buttonInputs: readonly (readonly [number, PadInput])[] = [
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"],
  [0, "face-bottom"],
  [1, "face-right"],
  [2, "face-left"],
  [3, "face-top"],
  [4, "L"],
  [5, "R"],
  [6, "ZL"],
  [7, "ZR"],
  [10, "L3"],
  [11, "R3"],
  [8, "select"],
  [9, "start"],
];

export type PadReading = Pick<
  Gamepad,
  "connected" | "mapping" | "buttons" | "axes"
>;

export function readGamepadInputs(
  gamepads: readonly (PadReading | null)[],
): Set<PadInput> {
  const pad = gamepads.find(
    (candidate) => candidate?.connected && candidate.mapping === "standard",
  );
  const inputs = new Set<PadInput>();
  if (!pad) return inputs;
  for (const [index, input] of buttonInputs) {
    const button = pad.buttons[index];
    if (button && (button.pressed || button.value > 0.75)) inputs.add(input);
  }
  for (const [axisIndex, negative, positive] of [
    [0, "ls-left", "ls-right"],
    [1, "ls-up", "ls-down"],
    [2, "rs-left", "rs-right"],
    [3, "rs-up", "rs-down"],
  ] as const) {
    const value = pad.axes[axisIndex];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value <= -0.65) inputs.add(negative);
    if (value >= 0.65) inputs.add(positive);
  }
  return inputs;
}

export function isGamepadComplete(seen: ReadonlySet<PadInput>) {
  return requiredGamepadInputs.every((input) => seen.has(input));
}
