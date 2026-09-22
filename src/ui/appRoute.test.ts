import { appUrlForStage, appUrlForView, readAppRoute } from "./appRoute";

const isStageId = (value: string): value is `S-${number}` => value === "S-000";

describe("app route", () => {
  it("gives a valid stage precedence over a main view", () => {
    expect(
      readAppRoute("https://example.test/?view=about&stage=S-000", isStageId),
    ).toEqual({ view: "stages", stageId: "S-000" });
  });

  it("falls back to the catalogue for invalid values", () => {
    expect(
      readAppRoute("https://example.test/?view=unknown&stage=S-999", isStageId),
    ).toEqual({ view: "stages", stageId: null });
  });

  it("keeps unrelated parameters while changing the main destination", () => {
    expect(
      new URL(
        appUrlForView(
          "https://example.test/?locale=ja&stage=S-000",
          "settings",
        ),
      ).search,
    ).toBe("?locale=ja&view=settings");
  });

  it("removes the main view when opening a stage", () => {
    expect(
      new URL(
        appUrlForStage("https://example.test/?locale=en&view=about", "S-000"),
      ).search,
    ).toBe("?locale=en&stage=S-000");
  });
});
