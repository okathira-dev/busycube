import { validMeasurement } from "./measurements";

const data = (...bytes: number[]) =>
  new DataView(Uint8Array.from(bytes).buffer);
it("requires valid complete battery bytes, nonempty UTF-8 device strings and actual environment fields", () => {
  for (const value of [0, 100])
    expect(validMeasurement(0x2a19, data(value))).toBe(true);
  for (const bytes of [[], [101], [255], [50, 0]])
    expect(validMeasurement(0x2a19, data(...bytes))).toBe(false);
  for (const id of [0x2a24, 0x2a29]) {
    expect(
      validMeasurement(
        id,
        new DataView(new TextEncoder().encode("製造社 Model").buffer),
      ),
    ).toBe(true);
    for (const bytes of [[], [32], [0], [65, 10], [0xc0, 0xaf]])
      expect(validMeasurement(id, data(...bytes))).toBe(false);
  }
  const temperature = new DataView(new ArrayBuffer(2));
  for (const value of [-27315, 0, 32767]) {
    temperature.setInt16(0, value, true);
    expect(validMeasurement(0x2a6e, temperature)).toBe(true);
  }
  for (const value of [-32768, -27316]) {
    temperature.setInt16(0, value, true);
    expect(validMeasurement(0x2a6e, temperature)).toBe(false);
  }
  expect(validMeasurement(0x2a6f, data(0x10, 0x27))).toBe(true);
  expect(validMeasurement(0x2a6f, data(0x11, 0x27))).toBe(false);
  expect(validMeasurement(0x2a6f, data(255, 255))).toBe(false);
  expect(validMeasurement(0x2a6d, data(0, 0, 0, 0))).toBe(true);
  expect(validMeasurement(0x2a6d, data(255, 255, 255, 255))).toBe(true);
  expect(validMeasurement(0x2a6d, data(1, 2, 3))).toBe(false);
});
it("checks heart-rate format flags and optional field boundaries without requiring exercise", () => {
  for (const bytes of [
    [0, 0],
    [1, 44, 1],
    [0x19, 44, 1, 0, 0, 0, 4],
  ])
    expect(validMeasurement(0x2a37, data(...bytes))).toBe(true);
  for (const bytes of [
    [],
    [0],
    [1, 44],
    [0, 60, 0],
    [16, 60],
    [16, 60, 1],
    [0x80, 60],
    [0x19, 44, 1, 0, 0, 0],
  ])
    expect(validMeasurement(0x2a37, data(...bytes))).toBe(false);
});
it("recognizes six FTMS formats including zero measurements, continuation packets and grouped fields", () => {
  const fixtures = [
    [0x2acd, [0, 0, 0, 0]],
    [0x2ace, [0, 0, 0, 0, 0]],
    [0x2acf, [0, 0, 0, 0, 0, 0]],
    [0x2ad0, [0, 0, 0, 0]],
    [0x2ad1, [0, 0, 0, 0, 0]],
    [0x2ad2, [0, 0, 0, 0]],
  ] as const;
  for (const [id, bytes] of fixtures) {
    expect(validMeasurement(id, data(...bytes))).toBe(true);
    expect(validMeasurement(id, data(...bytes.slice(0, -1)))).toBe(false);
    expect(validMeasurement(id, data(...bytes, 0))).toBe(false);
    expect(validMeasurement(id, data(1, 0))).toBe(false);
  }
  expect(validMeasurement(0x2ad2, data(5, 0, 0, 0))).toBe(true); // continuation with cadence
  expect(validMeasurement(0x2ace, data(0x80, 0, 0, 0, 0, 0))).toBe(true); // one-byte resistance
  expect(validMeasurement(0x2ace, data(0x80, 0, 0, 0, 0, 0, 0))).toBe(false);
  expect(validMeasurement(0x2ace, data(0, 0x80, 0, 0, 0))).toBe(true); // direction is not an extra field
  expect(validMeasurement(0x2ace, data(1, 0x80, 0))).toBe(false);
  expect(validMeasurement(0x2acd, data(8, 0, 0, 0, 0, 0, 0, 0))).toBe(true); // incline + ramp
  expect(validMeasurement(0x2ad1, data(3, 0, 0))).toBe(true); // continuation with average stroke rate
  expect(validMeasurement(0x2ad2, data(4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe(
    true,
  ); // speed + cadence + energy triple
  expect(validMeasurement(0x2ad2, data(0, 0x80, 0, 0))).toBe(false);
  expect(validMeasurement(0xffff, data(0, 0, 0, 0))).toBe(false);
});
