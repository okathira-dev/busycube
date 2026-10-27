import {
  completedGamepadGroups,
  gamepadGroups,
  type PadInput,
  type PadReading,
  readGamepadInputs,
} from "./functions";

function pad(
  buttonIndices: readonly number[] = [],
  axes: readonly number[] = [0, 0, 0, 0],
): PadReading {
  return {
    connected: true,
    mapping: "standard",
    axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({
      pressed: buttonIndices.includes(index),
      touched: false,
      value: buttonIndices.includes(index) ? 1 : 0,
    })),
  };
}

describe("S-200 controller parts", () => {
  it("accumulates sequential inputs for eight independent groups, with stick clicks separate", () => {
    const seen = new Set<PadInput>();
    for (const index of [12, 13, 14, 15])
      for (const input of readGamepadInputs([pad([index])])) seen.add(input);
    expect(completedGamepadGroups(seen)).toEqual(["B02"]);
    for (const axes of [
      [-1, 0, 0, 0],
      [1, 0, 0, 0],
      [0, -1, 0, 0],
      [0, 1, 0, 0],
    ])
      for (const input of readGamepadInputs([pad([], axes)])) seen.add(input);
    expect(completedGamepadGroups(seen)).toEqual(["B02", "B03"]);
    expect(completedGamepadGroups(seen)).not.toContain("B08");
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
      for (const input of readGamepadInputs([pad([index])])) seen.add(input);
    for (const axes of [
      [0, 0, -1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, -1],
      [0, 0, 0, 1],
    ])
      for (const input of readGamepadInputs([pad([], axes)])) seen.add(input);
    expect(completedGamepadGroups(seen)).toEqual(
      gamepadGroups.map((group) => group.box),
    );
  });

  it("does not require a home button and never accepts nonstandard or absent controllers", () => {
    expect(readGamepadInputs([pad([16])]).size).toBe(0);
    expect(readGamepadInputs([{ ...pad([0]), mapping: "" }]).size).toBe(0);
    expect(readGamepadInputs([{ ...pad([0]), connected: false }]).size).toBe(0);
    expect(readGamepadInputs([null]).size).toBe(0);
  });

  it("ignores neutral, missing and invalid axes while retaining the signed direction", () => {
    expect([
      ...readGamepadInputs([pad([], [0.64, -0.64, Number.NaN])]),
    ]).toEqual([]);
    expect([...readGamepadInputs([pad([], [-0.65, 0.65])])]).toEqual([
      "ls-left",
      "ls-down",
    ]);
  });
});
