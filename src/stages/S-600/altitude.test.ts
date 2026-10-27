import { altitudeY, observeAltitude } from "./altitude";

it("classifies the first complete observation using the retained conservative boundaries", () => {
  expect(observeAltitude(99.9, 0)?.band).toBe(0);
  expect(observeAltitude(100, 0)?.band).toBe(1);
  expect(observeAltitude(499.9, 0)?.band).toBe(1);
  expect(observeAltitude(500, 0)?.band).toBe(2);
  expect(observeAltitude(-100, 1)?.band).toBe(0);
  expect(observeAltitude(110, 10)?.band).toBe(1);
  expect(observeAltitude(510, 10)?.band).toBe(2);
  expect(observeAltitude(90, 10)?.band).toBeNull();
  expect(observeAltitude(100, 1)?.band).toBeNull();
  expect(observeAltitude(490, 10)?.band).toBeNull();
  expect(observeAltitude(500, 1)?.band).toBeNull();
});

it("does not replace missing precision or invalid observations with zero", () => {
  for (const value of [null, NaN, Infinity, -Infinity]) {
    expect(observeAltitude(value, 0)).toBeNull();
    expect(observeAltitude(0, value)).toBeNull();
  }
  expect(observeAltitude(0, -1)).toBeNull();
  expect(observeAltitude(Number.MAX_VALUE, Number.MAX_VALUE)).toBeNull();
});

it("places both boundaries at layer divisions and keeps uncertainty endpoints ordered", () => {
  expect(altitudeY(100)).toBe(280);
  expect(altitudeY(500)).toBe(140);
  expect(altitudeY(99)).toBeGreaterThan(280);
  expect(altitudeY(101)).toBeLessThan(280);
  expect(altitudeY(499)).toBeGreaterThan(140);
  expect(altitudeY(501)).toBeLessThan(140);
  expect(altitudeY(-10000)).toBe(380);
  expect(altitudeY(10000)).toBe(40);
  expect(altitudeY(110)).toBeLessThan(altitudeY(90));
});
