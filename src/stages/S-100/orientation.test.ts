import { Euler, Quaternion, Vector3 } from "three";
import {
  deviceRotation,
  initialPhoneRotation,
  phoneMatrix,
  relativePhoneRotation,
  UprightHold,
} from "./orientation";

describe("relative upright phone", () => {
  it("starts tilted and cancels the preset independently of the initial heading", () => {
    for (const alpha of [0, 73, 180, 350]) {
      const initial = deviceRotation({ alpha, beta: 17, gamma: -12 });
      if (!initial) throw new Error("Invalid fixture");
      expect(
        relativePhoneRotation(initial, initial).angleTo(initialPhoneRotation()),
      ).toBeCloseTo(0);
      const actualTarget = initial
        .clone()
        .multiply(initialPhoneRotation().invert());
      expect(
        relativePhoneRotation(initial, actualTarget).angleTo(new Quaternion()),
      ).toBeCloseTo(0);
      expect(phoneMatrix(relativePhoneRotation(initial, actualTarget))).toBe(
        "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
      );
    }
  });
  it("requires all real axes and respects alpha wraparound", () => {
    expect(deviceRotation({ alpha: null, beta: 0, gamma: 0 })).toBeUndefined();
    expect(
      deviceRotation({ alpha: 0, beta: Number.NaN, gamma: 0 }),
    ).toBeUndefined();
    expect(deviceRotation({ alpha: 0, beta: 0, gamma: 91 })).toBeUndefined();
    const first = deviceRotation({ alpha: 0, beta: 0, gamma: 0 });
    const wrapped = deviceRotation({ alpha: 360, beta: 0, gamma: 0 });
    expect(first?.angleTo(wrapped ?? new Quaternion())).toBeCloseTo(0);
  });
  it("requires a continuous second and resets on missing axes, a gap or leaving tolerance", () => {
    const hold = new UprightHold();
    const straight = new Quaternion();
    expect(hold.observe(straight, 0)).toBe(false);
    expect(hold.observe(straight, 400)).toBe(false);
    expect(hold.observe(straight, 800)).toBe(false);
    expect(hold.observe(straight, 1000)).toBe(true);
    hold.reset();
    expect(hold.observe(straight, 2000)).toBe(false);
    expect(hold.observe(straight, 2600)).toBe(false);
    expect(hold.observe(undefined, 2800)).toBe(false);
    expect(hold.observe(straight, 3000)).toBe(false);
    expect(
      hold.observe(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
        3200,
      ),
    ).toBe(false);
    expect(hold.observe(straight, 3400)).toBe(false);
  });
  it("keeps the complete rotation condition, including face and upright roll", () => {
    const hold = new UprightHold();
    const sideways = new Quaternion().setFromEuler(
      new Euler(0, 0, Math.PI / 2),
    );
    for (const time of [0, 400, 800, 1200])
      expect(hold.observe(sideways, time)).toBe(false);
  });
});
