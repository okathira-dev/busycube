import { hasS900CorrectOrder } from "./functions";

describe("S-900 reel order", () => {
  it("recognizes only the intended reel sequence", () => {
    expect(hasS900CorrectOrder(["A", "B", "C", "D"])).toBe(true);
    expect(hasS900CorrectOrder(["A", "C", "B", "D"])).toBe(false);
  });
});
