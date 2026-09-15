// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
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
});
