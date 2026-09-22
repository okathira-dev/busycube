// @vitest-environment jsdom

import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { createProgressDocument } from "../domain/progress";
import { SettingsView } from "./SettingsView";

type SettingsViewProps = ComponentProps<typeof SettingsView>;

function settingsProps(
  overrides: Partial<SettingsViewProps> = {},
): SettingsViewProps {
  return {
    headingId: "settings-heading",
    locale: "en",
    storageState: "ready",
    storageMessage: "Progress is stored locally.",
    serviceWorkerState: "ready",
    serviceWorkerMessage: "Offline launch is ready.",
    driveState: "unconfigured",
    driveStatusMessage: "Drive is not configured.",
    driveConfigured: false,
    driveConnected: false,
    driveFailure: null,
    driveFailureMessage: "Drive sync failed.",
    onExport: vi.fn(),
    onPrepareImport: vi.fn(async () => ({ status: "corrupt" as const })),
    onMergeImport: vi.fn(),
    onReset: vi.fn(async () => true),
    onApplyUpdate: vi.fn(),
    onDriveSync: vi.fn(),
    onDriveDisconnect: vi.fn(),
    onDriveDelete: vi.fn(),
    onDriveRetry: vi.fn(),
    onDriveDismissFailure: vi.fn(),
    onDriveExportReplica: vi.fn(),
    onDriveRemoveReplica: vi.fn(),
    ...overrides,
  };
}

describe("SettingsView", () => {
  it("merges imported progress only after preview confirmation", async () => {
    const imported = createProgressDocument("en", "imported");
    const onPrepareImport = vi.fn(async () => ({
      status: "ready" as const,
      document: imported,
      addedBoxes: 2,
      addedMarkers: 1,
    }));
    const onMergeImport = vi.fn();
    render(
      <SettingsView {...settingsProps({ onPrepareImport, onMergeImport })} />,
    );
    const file = new File(["{}"], "progress.json", {
      type: "application/json",
    });

    fireEvent.change(screen.getByLabelText("Import progress"), {
      target: { files: [file] },
    });

    const dialog = await screen.findByRole("dialog", {
      name: "Import progress",
    });
    expect(onPrepareImport).toHaveBeenCalledWith(file);
    expect(dialog.textContent).toContain("New boxes opened: 2");
    expect(dialog.textContent).toContain("Progress markers added: 1");
    expect(onMergeImport).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Import progress" }),
    );

    expect(onMergeImport).toHaveBeenCalledOnce();
    expect(onMergeImport).toHaveBeenCalledWith(imported);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Progress from the file was added to this device.",
    );
  });

  it.each([
    [true, "Progress on this device was reset."],
    [
      false,
      "Progress could not be reset. Check browser storage settings and try again.",
    ],
  ])("reports the reset result after confirmation", async (result, message) => {
    const onReset = vi.fn(async () => result);
    render(<SettingsView {...settingsProps({ onReset })} />);
    const reset = screen.getByRole("button", {
      name: "Reset progress on this device",
    });

    fireEvent.click(reset);
    const dialog = screen.getByRole("dialog", {
      name: "Reset progress on this device",
    });
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitForElementToBeRemoved(dialog);
    expect(onReset).not.toHaveBeenCalled();

    fireEvent.click(reset);
    const confirmDialog = screen.getByRole("dialog", {
      name: "Reset progress on this device",
    });
    fireEvent.click(
      within(confirmDialog).getByRole("button", {
        name: "Reset progress on this device",
      }),
    );

    await waitFor(() => expect(onReset).toHaveBeenCalledOnce());
    expect((await screen.findByRole("alert")).textContent).toContain(message);
  });

  it("routes Drive recovery actions to the selected replica", async () => {
    const first = { id: "first", name: "backup-first.json" };
    const second = { id: "second", name: "backup-second.json" };
    const onDriveRetry = vi.fn();
    const onDriveDismissFailure = vi.fn();
    const onDriveExportReplica = vi.fn();
    const onDriveRemoveReplica = vi.fn();
    render(
      <SettingsView
        {...settingsProps({
          driveState: "error",
          driveStatusMessage: "Drive sync failed.",
          driveFailure: { code: "corrupt", replicas: [first, second] },
          driveFailureMessage: "A backup cannot be read.",
          onDriveRetry,
          onDriveDismissFailure,
          onDriveExportReplica,
          onDriveRemoveReplica,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry Drive sync" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue locally without changing Drive",
      }),
    );
    expect(onDriveRetry).toHaveBeenCalledOnce();
    expect(onDriveDismissFailure).toHaveBeenCalledOnce();

    const secondReplica = screen.getByText(second.name).parentElement;
    if (!secondReplica) throw new Error("second Drive replica is unavailable");
    fireEvent.click(
      within(secondReplica).getByRole("button", { name: "Save this backup" }),
    );
    expect(onDriveExportReplica).toHaveBeenCalledWith(second);

    fireEvent.click(
      within(secondReplica).getByRole("button", {
        name: "Delete only this backup",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Delete only this backup",
    });
    expect(onDriveRemoveReplica).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Delete only this backup",
      }),
    );
    expect(onDriveRemoveReplica).toHaveBeenCalledOnce();
    expect(onDriveRemoveReplica).toHaveBeenCalledWith(second);
  });
});
