export const gamepadGroups = [
  { box: "B02", name: "dpad", inputs: ["up", "left", "down", "right"] },
  {
    box: "B03",
    name: "left-stick",
    inputs: ["ls-up", "ls-left", "ls-down", "ls-right"],
  },
  {
    box: "B04",
    name: "right-stick",
    inputs: ["rs-up", "rs-left", "rs-down", "rs-right"],
  },
  {
    box: "B05",
    name: "face",
    inputs: ["face-top", "face-left", "face-bottom", "face-right"],
  },
  { box: "B06", name: "shoulders", inputs: ["L", "R"] },
  { box: "B07", name: "triggers", inputs: ["ZL", "ZR"] },
  { box: "B08", name: "clicks", inputs: ["L3", "R3"] },
  { box: "B09", name: "center", inputs: ["select", "start"] },
] as const;

export type PadInput = (typeof gamepadGroups)[number]["inputs"][number];

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

export function completedGamepadGroups(seen: ReadonlySet<PadInput>) {
  return gamepadGroups
    .filter((group) => group.inputs.every((input) => seen.has(input)))
    .map((group) => group.box);
}
