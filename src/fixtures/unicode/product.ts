import {
  formatUnicodeOperand,
  unicodeFixtures as sourceFixtures,
  type UnicodeFixture,
} from "./data";
import problems from "./product-problems.json";

function isBoxId(value: string): value is `B${string}` {
  return /^B\d+$/.test(value);
}

export const unicodeFixtures: readonly UnicodeFixture[] = problems.map(
  (problem) => {
    const source = sourceFixtures.find(
      (fixture) => fixture.id === problem.sourceId,
    );
    const id = problem.id;
    if (!source || !isBoxId(id))
      throw new Error("Invalid Unicode problem mapping");
    return {
      ...source,
      id,
      leftValue: problem.leftValue,
      rightValue: problem.rightValue,
      leftText: formatUnicodeOperand(source, problem.leftValue),
      rightText: formatUnicodeOperand(source, problem.rightValue),
      answer: problem.leftValue + problem.rightValue,
    };
  },
);
