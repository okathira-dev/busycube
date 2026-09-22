import { activeS910CueId } from "./functions";

describe("S-910 runtime cues", () => {
  it("maps each intended video moment to exactly one cue", () => {
    expect(activeS910CueId(0.8)).toBe("circle");
    expect(activeS910CueId(1.9)).toBe("triangle");
    expect(activeS910CueId(3.1)).toBe("square");
    expect(activeS910CueId(0)).toBeUndefined();
  });
});
