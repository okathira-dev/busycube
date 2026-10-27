import { initialAxis, observeAxis } from "./axes";

it("requires both inclusive 50 thresholds in either order and keeps axes independent", () => {
  const quiet = observeAxis(observeAxis(initialAxis(), -49.999), 49.999);
  expect(quiet.negative || quiet.positive).toBe(false);
  const positive = observeAxis(initialAxis(), 50);
  expect(positive).toMatchObject({ positive: true, negative: false });
  expect(observeAxis(positive, -50)).toMatchObject({
    positive: true,
    negative: true,
  });
  const negative = observeAxis(initialAxis(), -50);
  expect(negative).toMatchObject({ positive: false, negative: true });
  expect(observeAxis(negative, 50)).toMatchObject({
    positive: true,
    negative: true,
  });
  expect(initialAxis()).toEqual({
    value: null,
    negative: false,
    positive: false,
  });
});
it("does not turn missing/nonfinite observations into zero or threshold crossings", () => {
  for (const value of [null, NaN, Infinity, -Infinity]) {
    expect(observeAxis(initialAxis(), value)).toEqual(initialAxis());
    expect(observeAxis(observeAxis(initialAxis(), 50), value)).toEqual({
      value: null,
      positive: true,
      negative: false,
    });
  }
});
