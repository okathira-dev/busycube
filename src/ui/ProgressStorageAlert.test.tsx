// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { ProgressStorageAlert } from "./ProgressStorageAlert";

describe("ProgressStorageAlert", () => {
  it("stays hidden while storage is healthy", () => {
    const { container } = render(
      <ProgressStorageAlert
        locale="en"
        state="ready"
        message="ready"
        onOpenSettings={vi.fn()}
        onRetry={vi.fn(async () => true)}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("offers retry and settings when storage is unavailable", () => {
    const onRetry = vi.fn(async () => true);
    const onOpenSettings = vi.fn();
    render(
      <ProgressStorageAlert
        locale="en"
        state="unavailable"
        message="Progress cannot be saved"
        onOpenSettings={onOpenSettings}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry storage" }));
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("disables retry until the pending attempt has finished", async () => {
    let finish!: (value: boolean) => void;
    const onRetry = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <ProgressStorageAlert
        locale="en"
        state="unavailable"
        message="Not saved"
        onOpenSettings={vi.fn()}
        onRetry={onRetry}
      />,
    );
    const button = screen.getByRole("button", { name: "Retry storage" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(button).toHaveProperty("disabled", true);
    await act(async () => {
      finish(false);
    });
    expect(button).toHaveProperty("disabled", false);
  });
});
