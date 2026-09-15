import { pageMetadata } from "./pageMetadata";

describe("pageMetadata", () => {
  it("builds localized section metadata", () => {
    expect(pageMetadata({ locale: "en", view: "settings" })).toEqual({
      title: "Settings | Busycube: Web API Explorer",
      description:
        "A Web API puzzle game where browser, device, permissions, and files become clues.",
    });
  });

  it("includes the display code and localized stage name", () => {
    expect(
      pageMetadata({
        locale: "ja",
        view: "stages",
        displayCode: "BOX-01",
        stageName: "最初の箱",
      }).title,
    ).toBe("BOX-01 最初の箱 | Busycube: Web API Explorer");
  });
});
