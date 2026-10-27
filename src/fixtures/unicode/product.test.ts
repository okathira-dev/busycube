import { parseUnicodeOperand, unicodeFixtures as sourceFixtures } from "./data";
import { unicodeFixtures } from "./product";

it("publishes a new fixed set of seventeen three-digit additions with unique answers", () => {
  expect(unicodeFixtures).toHaveLength(17);
  expect(new Set(unicodeFixtures.map((fixture) => fixture.answer)).size).toBe(
    17,
  );
  expect(unicodeFixtures.map((fixture) => fixture.id)).toEqual(
    Array.from({ length: 17 }, (_, i) => `B${i + 18}`),
  );
  for (const [index, fixture] of unicodeFixtures.entries()) {
    expect(fixture.systemName).toBe(sourceFixtures[index]?.systemName);
    expect(fixture.leftValue).toBeGreaterThanOrEqual(fixture.radix ** 2);
    expect(fixture.rightValue).toBeGreaterThanOrEqual(fixture.radix ** 2);
    expect(fixture.leftValue).toBeLessThan(fixture.radix ** 3);
    expect(fixture.rightValue).toBeLessThan(fixture.radix ** 3);
    expect(parseUnicodeOperand(fixture, fixture.leftText)).toBe(
      fixture.leftValue,
    );
    expect(parseUnicodeOperand(fixture, fixture.rightText)).toBe(
      fixture.rightValue,
    );
    expect(fixture.answer).toBe(fixture.leftValue + fixture.rightValue);
  }
});
