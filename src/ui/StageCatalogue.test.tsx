// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { StageCatalogue } from "./StageCatalogue";
import type { CatalogueStage } from "./stageCatalogueModel";

const stage = {
  manifest: {
    id: "S-999",
    name: { ja: "試験ステージ", en: "Test stage" },
    platform: { baseline: "widely", permission: "none" },
    boxIds: ["B01"],
    box: { B01: "B01" },
    load: vi.fn(async () => {
      throw new Error("not used by the catalogue test");
    }),
  },
  accessKind: "baseline-direct",
  displayCode: "D-001",
} satisfies CatalogueStage;

describe("StageCatalogue preload", () => {
  it("starts only when stage activation begins, not on hover or focus", () => {
    const onOpen = vi.fn();
    const onPreload = vi.fn();
    render(
      <StageCatalogue
        headingId="stage-heading"
        heading="Box room"
        progressLabel="Progress"
        solvedCount={0}
        totalBoxCount={1}
        locale="en"
        stages={[stage]}
        progressStages={{}}
        nextIncompleteStage={stage}
        restore={null}
        onOpen={onOpen}
        onPreload={onPreload}
      />,
    );

    const continueButton = screen.getByRole("button", {
      name: /Next unopened stage/,
    });
    fireEvent.pointerEnter(continueButton);
    fireEvent.focus(continueButton);
    fireEvent.pointerDown(continueButton, { button: 2 });
    expect(onPreload).not.toHaveBeenCalled();

    fireEvent.pointerDown(continueButton, { button: 0 });
    expect(onPreload).toHaveBeenLastCalledWith("S-999");

    onPreload.mockClear();
    fireEvent.keyDown(continueButton, { key: "Enter" });
    expect(onPreload).toHaveBeenCalledWith("S-999");
  });
});
