// @vitest-environment jsdom
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import { act, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { createProgressDocument } from "../domain/progress";
import type { ProgressController, StorageState } from "../hooks/useProgress";
import {
  ManifestStageHost,
  preloadStageModule,
} from "../runtime/ManifestStageHost";
import type { StageManifest, StageModule } from "../runtime/stageContract";
import { ProgressStorageAlert } from "../ui/ProgressStorageAlert";
import { SettingsView } from "../ui/SettingsView";

// Anchor the FSL UI projections to the real components.
const module: StageModule = {
  id: "S-995",
  boxes: {
    B01: { icon: Inventory2Outlined, label: { ja: "箱", en: "Box" } },
  },
  probe: () => "available",
  Component: () => <div data-testid="playable-stage" />,
};
const manifest: StageManifest = {
  id: "S-995",
  name: { ja: "検証", en: "Recovery fixture" },
  boxIds: ["B01"],
  box: { B01: "B01" },
  platform: { baseline: "widely", permission: "none" },
  load: async () => module,
};

test.each<[StorageState, boolean]>([
  ["loading", false],
  ["unavailable", false],
  ["corrupt", false],
  ["future", false],
  ["ready", true],
  ["unavailable", true],
])("FSL UI projection for %s, initialized=%s", async (status, initialized) => {
  window.scrollTo = vi.fn();
  await preloadStageModule(manifest);
  const progress: ProgressController = {
    document: createProgressDocument("fixture"),
    settings: { locale: "en" },
    epoch: "fixture-epoch",
    initialized,
    storageState: status,
    setLocale: vi.fn(),
    solve: vi.fn(),
    mark: vi.fn(),
    hasMarker: () => false,
    mergeProgress: async () => true,
    retryStorage: async () => true,
    reset: async () => true,
  };
  const settings: ComponentProps<typeof SettingsView> = {
    headingId: "settings-fixture",
    locale: "en",
    storageState: status,
    storageMessage: "Storage fixture",
    storageInitialized: initialized,
    serviceWorkerState: "ready",
    serviceWorkerMessage: "Ready",
    driveState: "unconfigured",
    driveStatusMessage: "Unconfigured",
    driveConfigured: false,
    driveConnected: false,
    driveFailure: null,
    driveFailureMessage: "",
    onExport: vi.fn(),
    onPrepareImport: async () => ({ status: "corrupt" }),
    onMergeImport: async () => true,
    onReset: async () => true,
    onApplyUpdate: vi.fn(),
    onDriveSync: vi.fn(),
    onDriveDisconnect: vi.fn(),
    onDriveDelete: vi.fn(),
    onDriveRetry: vi.fn(),
    onDriveDismissFailure: vi.fn(),
    onDriveExportReplica: vi.fn(),
    onDriveRemoveReplica: vi.fn(),
  };
  const stage = render(
    <ManifestStageHost
      manifest={manifest}
      displayCode="Fixture"
      locale="en"
      progress={progress}
      services={{}}
      onBack={vi.fn()}
    />,
  );
  await act(async () => {});
  expect(stage.queryByTestId("playable-stage") !== null).toBe(
    status !== "loading",
  );
  expect(stage.container.querySelector(".stage-loading") !== null).toBe(
    status === "loading",
  );
  const alert = render(
    <ProgressStorageAlert
      locale="en"
      state={status}
      message="Storage fixture"
      onOpenSettings={vi.fn()}
      onRetry={progress.retryStorage}
    />,
  );
  expect(alert.queryByRole("button", { name: "Retry storage" }) !== null).toBe(
    status !== "ready" && status !== "loading",
  );
  const view = render(<SettingsView {...settings} />);
  expect(view.getByRole("button", { name: "Export progress" })).toHaveProperty(
    "disabled",
    !initialized,
  );
});
