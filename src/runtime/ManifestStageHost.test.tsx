// @vitest-environment jsdom

import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createProgressDocument } from "../domain/progress";
import type { ProgressController } from "../hooks/useProgress";
import { ManifestStageHost } from "./ManifestStageHost";
import type {
  StageIdFormat,
  StageManifest,
  StageModule,
} from "./stageContract";

function createStage(id: StageIdFormat, name: string) {
  const module: StageModule = {
    id,
    boxes: {
      B01: {
        icon: Inventory2Outlined,
        label: { ja: name, en: name },
      },
    },
    probe: () => "available",
    Component: () => null,
  };
  const load = vi.fn(async () => module);
  const manifest: StageManifest = {
    id,
    name: { ja: name, en: name },
    platform: { baseline: "widely", permission: "none" },
    boxIds: ["B01"],
    box: { B01: "B01" },
    load,
  };
  return { load, manifest };
}

const progress: ProgressController = {
  document: createProgressDocument("en"),
  storageState: "ready",
  setLocale: vi.fn(),
  solve: vi.fn(),
  hasMarker: vi.fn(() => false),
  mark: vi.fn(),
  replaceDocument: vi.fn(),
  retryStorage: vi.fn(async () => true),
  reset: vi.fn(async () => true),
};

describe("ManifestStageHost navigation preload", () => {
  it("loads only the stage whose previous or next action has begun", async () => {
    window.scrollTo = vi.fn();
    const current = createStage("S-997", "Current stage");
    const previous = createStage("S-996", "Previous target");
    const next = createStage("S-998", "Next target");
    render(
      <ManifestStageHost
        manifest={current.manifest}
        displayCode="D-002"
        previousStage={previous.manifest}
        previousDisplayCode="D-001"
        nextStage={next.manifest}
        nextDisplayCode="D-003"
        locale="en"
        progress={progress}
        services={{}}
        onBack={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    await waitFor(() => expect(current.load).toHaveBeenCalledOnce());

    const previousButton = screen.getByRole("button", {
      name: /Previous stage.*Previous target/,
    });
    const nextButton = screen.getByRole("button", {
      name: /Next stage.*Next target/,
    });

    fireEvent.pointerEnter(previousButton);
    fireEvent.focus(previousButton);
    fireEvent.pointerDown(previousButton, { button: 2 });
    expect(previous.load).not.toHaveBeenCalled();
    expect(next.load).not.toHaveBeenCalled();

    fireEvent.pointerDown(previousButton, { button: 0 });
    expect(previous.load).toHaveBeenCalledOnce();
    expect(next.load).not.toHaveBeenCalled();

    fireEvent.keyDown(nextButton, { key: "Enter" });
    expect(next.load).toHaveBeenCalledOnce();
  });
});
