import { NavigationJourney, traversalDirection } from "./navigationJourney";

describe("stage arrivals", () => {
  it("requires another stage, rather than a catalogue visit, for a revisit", () => {
    const journey = new NavigationJourney("S-060", "navigate");
    expect(journey.arrival.revisit).toBe(false);
    journey.enter(null, "navigate");
    expect(journey.enter("S-060", "navigate").revisit).toBe(false);
    journey.enter("S-070", "navigate");
    expect(journey.enter("S-060", "back").revisit).toBe(true);
  });

  it("does not turn a reload into a revisit or later game navigation into a reload", () => {
    const journey = new NavigationJourney("S-060", "reload");
    expect(journey.arrival.revisit).toBe(false);
    expect(journey.enter("S-220", "navigate")).toEqual({
      stageId: "S-220",
      kind: "navigate",
      revisit: false,
    });
    const reload = new NavigationJourney("S-220", "reload");
    expect(reload.arrival.kind).toBe("reload");
    reload.enter("S-060", "navigate");
    expect(reload.enter("S-220", "navigate").kind).toBe("navigate");
  });

  it("uses observed entry indices to distinguish back from forward and leaves unknown directions unresolved", () => {
    expect(traversalDirection(4, 2)).toBe("back");
    expect(traversalDirection(2, 4)).toBe("forward");
    expect(traversalDirection(-1, 4)).toBe("navigate");
    expect(traversalDirection(4, -1)).toBe("navigate");
    expect(traversalDirection(4, 4)).toBe("navigate");
  });
});
