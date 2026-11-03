import {
  isGamepadComplete,
  type PadInput,
  type PadReading,
  readGamepadInputs,
  requiredGamepadInputs,
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

describe("S-200 controller", () => {
  it("requires every button and both directions of every stick axis, accumulated sequentially", () => {
    const seen = new Set<PadInput>();
    for (let index = 0; index < 16; index++) {
      for (const input of readGamepadInputs([pad([index])])) seen.add(input);
      expect(isGamepadComplete(seen)).toBe(false);
    }
    for (let axis = 0; axis < 4; axis++) {
      for (const sign of [-1, 1]) {
        expect(isGamepadComplete(seen)).toBe(false);
        const axes = [0, 0, 0, 0];
        axes[axis] = sign;
        for (const input of readGamepadInputs([pad([], axes)])) seen.add(input);
      }
    }
    expect(isGamepadComplete(seen)).toBe(true);
  });

  it.each(requiredGamepadInputs)(
    "does not complete while %s is missing",
    (missing) => {
      const seen = new Set<PadInput>(requiredGamepadInputs);
      seen.delete(missing);
      expect(isGamepadComplete(seen)).toBe(false);
    },
  );

  it("reads the standard controller regardless of slot, ignoring unrecognized layouts", () => {
    const unmapped = { ...pad([0]), mapping: "" as const };
    expect([...readGamepadInputs([null, unmapped, pad([1])])]).toEqual([
      "face-right",
    ]);
  });

  it("does not require a home button and never accepts nonstandard or absent controllers", () => {
    expect(readGamepadInputs([pad([16])]).size).toBe(0);
    expect(readGamepadInputs([{ ...pad([0]), mapping: "" }]).size).toBe(0);
    expect(readGamepadInputs([{ ...pad([0]), connected: false }]).size).toBe(0);
    expect(readGamepadInputs([null]).size).toBe(0);
    expect(isGamepadComplete(new Set())).toBe(false);
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
