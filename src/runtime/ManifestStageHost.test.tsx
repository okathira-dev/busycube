// @vitest-environment jsdom

import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createProgressDocument } from "../domain/progress";
import type { ProgressController } from "../hooks/useProgress";
import { StageProblemGiftBox } from "../ui/GiftBox";
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
  afterEach(() => cleanup());
  it("initializes replay history after persistent progress loads, while keeping this attempt separate", async () => {
    window.scrollTo = vi.fn();
    const current = createStage("S-995", "Replay fixture");
    const manifest: StageManifest = {
      ...current.manifest,
      load: async (): Promise<StageModule> => ({
        id: "S-995",
        probe: () => "available",
        boxes: {
          B01: {
            icon: Inventory2Outlined,
            label: { ja: "履歴", en: "History" },
          },
        },
        Component: (props) => {
          const box = props.boxes.B01;
          if (!box) throw new Error("Missing fixture box");
          return (
            <StageProblemGiftBox
              box={box}
              locale={props.locale}
              onClick={box.solve}
            />
          );
        },
      }),
    };
    const initial = { ...progress, storageState: "loading" as const };
    const properties = {
      manifest,
      displayCode: "D-000",
      locale: "en" as const,
      services: {},
      onBack: vi.fn(),
    };
    const view = render(
      <ManifestStageHost {...properties} progress={initial} />,
    );
    expect(screen.getByText("Loading stage…")).toBeTruthy();
    const loaded = {
      ...progress,
      document: {
        ...progress.document,
        stages: { "S-995": { solvedBoxIds: ["B01"] } },
      },
    };
    view.rerender(<ManifestStageHost {...properties} progress={loaded} />);
    await waitFor(() =>
      expect(
        view.container
          .querySelector(".problem-gift .gift-box")
          ?.getAttribute("data-box-state"),
      ).toBe("closed"),
    );
    fireEvent.click(screen.getByRole("button", { name: /^History:/ }));
    expect(
      view.container
        .querySelector(".problem-gift .gift-box")
        ?.getAttribute("data-box-state"),
    ).toBe("open");
  });
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
