import { shuffleAllPositions } from "./functions";

it("moves all ten identities to different positions while keeping a complete permutation", () => {
  let seed = 34;
  const random = (limit: number) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % limit;
  };
  let positions = Array.from({ length: 10 }, (_, i) => i);
  for (let round = 0; round < 100; round += 1) {
    const next = shuffleAllPositions(positions, random);
    expect([...next].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 10 }, (_, i) => i),
    );
    expect(next.every((position, i) => position !== positions[i])).toBe(true);
    positions = next;
  }
});
