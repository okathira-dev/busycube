import { accelerationMagnitude, reachesTarget } from "./acceleration";

it("uses one actual vector magnitude with the explicitly provisional inclusive threshold", () => {
  expect(accelerationMagnitude([0, 0, 9.8])).toBe(9.8);
  expect(reachesTarget(accelerationMagnitude([0, -2, 0]))).toBe(true);
  expect(reachesTarget(accelerationMagnitude([2, 0.001, 0]))).toBe(false);
  expect(reachesTarget(accelerationMagnitude([0, 0, 0]))).toBe(true);
  expect(accelerationMagnitude([3, 4, 0])).toBe(5);
});

it("never treats missing, nonfinite, or overflowed readings as zero", () => {
  for (const value of [null, NaN, Infinity, -Infinity]) {
    expect(accelerationMagnitude([0, value, 0])).toBeNull();
    expect(reachesTarget(value)).toBe(false);
  }
  expect(accelerationMagnitude([])).toBeNull();
  expect(
    accelerationMagnitude([Number.MAX_VALUE, Number.MAX_VALUE, 0]),
  ).toBeNull();
  expect(reachesTarget(-1)).toBe(false);
});
