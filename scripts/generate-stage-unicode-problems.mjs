import { randomInt } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { unicodeFixtures } from "../src/fixtures/unicode/data.ts";

const answers = new Set();
const problems = unicodeFixtures.map((fixture, index) => {
  let leftValue;
  let rightValue;
  do {
    leftValue = randomInt(fixture.radix ** 2, fixture.radix ** 3);
    rightValue = randomInt(fixture.radix ** 2, fixture.radix ** 3);
  } while (
    answers.has(leftValue + rightValue) ||
    (fixture.system.kind === "counting-rods" &&
      `${leftValue}${rightValue}`.includes("0"))
  );
  answers.add(leftValue + rightValue);
  return {
    id: `B${String(index + 18).padStart(2, "0")}`,
    sourceId: fixture.id,
    leftValue,
    rightValue,
  };
});
await writeFile(
  resolve(import.meta.dirname, "../src/fixtures/unicode/product-problems.json"),
  `${JSON.stringify(problems, null, 2)}\n`,
);
