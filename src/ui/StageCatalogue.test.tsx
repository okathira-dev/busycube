// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
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
      name: /Continue/,
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

describe("StageCatalogue accessible names", () => {
  it.each(["ja", "en"] as const)(
    "marks P and L groups and cards as preview in %s",
    (locale) => {
      const label = locale === "ja" ? "暫定版" : "Preview";
      const stages: CatalogueStage[] = [
        stage,
        {
          ...stage,
          manifest: { ...stage.manifest, id: "S-998" },
          accessKind: "baseline-permission",
          displayCode: "P-001",
        },
        {
          ...stage,
          manifest: { ...stage.manifest, id: "S-997" },
          accessKind: "limited",
          displayCode: "L-001",
        },
      ];
      render(
        <StageCatalogue
          headingId="stage-heading"
          heading="Box room"
          progressLabel="Progress"
          solvedCount={0}
          totalBoxCount={3}
          locale={locale}
          stages={stages}
          progressStages={{}}
          restore={null}
          onOpen={vi.fn()}
          onPreload={vi.fn()}
        />,
      );
      expect(screen.getAllByText(label, { exact: true })).toHaveLength(4);
      for (const item of stages) {
        const card = screen.getByRole("button", {
          name: new RegExp(item.displayCode),
        });
        expect(within(card).queryByText(label, { exact: true }) !== null).toBe(
          item.accessKind !== "baseline-direct",
        );
      }
    },
  );

  it.each([
    ["ja", "試験ステージ"],
    ["en", "Test stage"],
  ] as const)(
    "uses the card content as its %s accessible name",
    (locale, name) => {
      render(
        <StageCatalogue
          headingId="stage-heading"
          heading="Box room"
          progressLabel="Progress"
          solvedCount={0}
          totalBoxCount={1}
          locale={locale}
          stages={[stage]}
          progressStages={{}}
          nextIncompleteStage={stage}
          restore={null}
          onOpen={vi.fn()}
          onPreload={vi.fn()}
        />,
      );

      const card = screen.getByRole("button", {
        name: new RegExp(`D-001\\s+0/1\\s+${name}`),
      });
      expect(card.hasAttribute("aria-label")).toBe(false);
    },
  );
});
