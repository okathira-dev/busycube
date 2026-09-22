// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { DriveSyncToast } from "./DriveSyncToast";

describe("DriveSyncToast", () => {
  it("updates one global notification as sync progresses", () => {
    const onOpenSettings = vi.fn();
    const { rerender } = render(
      <DriveSyncToast
        state="syncing"
        message="Syncing progress"
        openSettingsLabel="Open settings"
        onOpenSettings={onOpenSettings}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Syncing progress",
    );

    rerender(
      <DriveSyncToast
        state="success"
        message="Progress synced"
        openSettingsLabel="Open settings"
        onOpenSettings={onOpenSettings}
      />,
    );

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("Progress synced");

    rerender(
      <DriveSyncToast
        state="error"
        message="Sync failed"
        openSettingsLabel="Open settings"
        onOpenSettings={onOpenSettings}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Sync failed");
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
