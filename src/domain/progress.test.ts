import {
  countProgressAdditions,
  createProgressDocument,
  hasStageMarker,
  markStage,
  mergeProgressDocuments,
  parseProgressDocument,
  solveBox,
} from "./progress";

describe("Busycube progress", () => {
  it("creates an empty stage-scoped document", () => {
    expect(createProgressDocument("install-a")).toEqual({
      schemaVersion: 2,
      sourceStorageId: "install-a",
      stages: {},
    });
  });

  it("never regresses solved boxes when documents merge", () => {
    const local = solveBox(createProgressDocument("a"), "S-000", "B01");
    const remote = solveBox(createProgressDocument("b"), "S-020", "B01");
    const merged = mergeProgressDocuments(local, remote);

    expect(merged.stages).toEqual({
      "S-000": { solvedBoxIds: ["B01"] },
      "S-020": { solvedBoxIds: ["B01"] },
    });
    expect(merged.sourceStorageId).toBe("a");
  });

  it("unions box clears and stage markers", () => {
    const base = createProgressDocument("a");
    const local = markStage(solveBox(base, "S-010", "B01"), "S-010", "entered");
    const remote = solveBox(base, "S-010", "B02");
    const merged = mergeProgressDocuments(local, remote);

    expect(merged.stages["S-010"]).toEqual({
      solvedBoxIds: ["B01", "B02"],
      markers: ["entered"],
    });
    expect(hasStageMarker(merged, "S-010", "entered")).toBe(true);
  });

  it("counts only progress that an import would add", () => {
    const current = markStage(
      solveBox(createProgressDocument("a"), "S-010", "B01"),
      "S-010",
      "entered",
    );
    const imported = markStage(
      solveBox(
        solveBox(createProgressDocument("b"), "S-010", "B01"),
        "S-010",
        "B02",
      ),
      "S-010",
      "returned",
    );

    expect(countProgressAdditions(current, imported)).toEqual({
      addedBoxes: 1,
      addedMarkers: 1,
    });
  });

  it("rejects old development saves instead of carrying migration code", () => {
    expect(
      parseProgressDocument({
        schemaVersion: 2,
        sourceStorageId: "old-install",
        boxes: {},
      }),
    ).toEqual({ status: "corrupt", reason: "required-fields" });
  });

  it("protects future documents from overwrite", () => {
    expect(parseProgressDocument({ schemaVersion: 99 })).toEqual({
      status: "future",
      version: 99,
    });
  });

  it("normalizes duplicate persisted IDs", () => {
    const parsed = parseProgressDocument({
      schemaVersion: 2,
      sourceStorageId: "install-a",
      stages: {
        "S-000": { solvedBoxIds: ["B01", "B01"], markers: ["seen", "seen"] },
      },
    });

    expect(parsed).toEqual({
      status: "valid",
      document: {
        schemaVersion: 2,
        sourceStorageId: "install-a",
        stages: {
          "S-000": { solvedBoxIds: ["B01"], markers: ["seen"] },
        },
      },
    });
  });
});
