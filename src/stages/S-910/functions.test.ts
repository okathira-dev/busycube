import { activeS910CueId, captionInterval, validS910Cue } from "./functions";

describe("S-910 runtime cues", () => {
  it("maps each intended video moment to exactly one cue", () => {
    expect(activeS910CueId(0.8)).toBe("circle");
    expect(activeS910CueId(1.9)).toBe("triangle");
    expect(activeS910CueId(3.1)).toBe("square");
    expect(activeS910CueId(0)).toBeUndefined();
  });
  it("uses actual frame boundaries with exclusive ends and clips the whole caption span", () => {
    expect(activeS910CueId(1.25)).toBe("circle");
    expect(activeS910CueId(1.267)).toBeUndefined();
    expect(activeS910CueId(1.55)).toBeUndefined();
    expect(activeS910CueId(1.6)).toBe("triangle");
    expect(captionInterval(1.25, 4)).toEqual({ start: 1.25, end: 1.267 });
    expect(captionInterval(Number.NaN, 4)).toBeUndefined();
    expect(captionInterval(4, 4)).toBeUndefined();
  });
  it("rejects wrong symbols, blank-video starts and spans crossing into another interval", () => {
    const cue = { id: "circle", text: "○", startTime: 0.8, endTime: 1.25 };
    expect(validS910Cue(cue)).toBe(true);
    expect(validS910Cue({ ...cue, startTime: 0.39 })).toBe(false);
    expect(validS910Cue({ ...cue, endTime: 1.268 })).toBe(false);
    expect(validS910Cue({ ...cue, text: "△" })).toBe(false);
    expect(validS910Cue({ ...cue, id: "triangle" })).toBe(false);
    expect(validS910Cue({ ...cue, endTime: 0.8 })).toBe(false);
    expect(validS910Cue({ ...cue, endTime: Infinity })).toBe(false);
  });
});
