import type { StageManifest } from "../runtime/stageContract";
import {
  buildCatalogueStages,
  findNextIncompleteStage,
} from "./stageCatalogueModel";

function stage(
  id: `S-${number}`,
  access: "direct" | "permission" | "limited",
  boxes: readonly `B${number}`[] = ["B01"],
): StageManifest {
  return {
    id,
    name: { ja: id, en: id },
    platform: {
      baseline: access === "limited" ? "limited" : "widely",
      permission: access === "permission" ? "required" : "none",
    },
    boxIds: boxes,
    box: Object.fromEntries(boxes.map((boxId) => [boxId, boxId])),
    load: () => Promise.reject(new Error("not used")),
  } as StageManifest;
}

describe("stage catalogue presentation model", () => {
  const stages = [
    stage("S-000", "direct"),
    stage("S-010", "permission"),
    stage("S-020", "direct", ["B01", "B02"]),
    stage("S-030", "limited"),
  ];

  it("keeps internal IDs while assigning group-specific display codes", () => {
    expect(
      buildCatalogueStages(stages).map(({ manifest, displayCode }) => [
        manifest.id,
        displayCode,
      ]),
    ).toEqual([
      ["S-000", "D-001"],
      ["S-020", "D-002"],
      ["S-010", "P-001"],
      ["S-030", "L-001"],
    ]);
  });

  it("continues a partial stage before an unstarted stage", () => {
    const catalogue = buildCatalogueStages(stages);
    expect(
      findNextIncompleteStage(catalogue, {
        "S-000": { solvedBoxIds: ["B01"] },
        "S-020": { solvedBoxIds: ["B01"] },
      })?.manifest.id,
    ).toBe("S-020");
  });
});
