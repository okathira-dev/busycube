// @vitest-environment jsdom

import { webcrypto } from "node:crypto";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage } from "./stage";

it("stops a microphone granted after stage departure without opening either box", async () => {
  vi.stubGlobal("crypto", webcrypto);
  let release: ((value: unknown) => void) | undefined;
  const permission = new Promise((resolve) => {
    release = resolve;
  });
  const getUserMedia = vi.fn(() => permission);
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  const controller = new AbortController();
  const solve = vi.fn();
  const props: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: { installationId: "test-installation" },
  };
  try {
    render(<stage.Component {...props} />);
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Speaker" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Window:/ }));
    expect(getUserMedia).toHaveBeenCalledOnce();
    act(() => controller.abort());
    const stop = vi.fn();
    await act(async () => {
      release?.({ getTracks: () => [{ stop }] });
      await permission;
    });
    expect(stop).toHaveBeenCalledOnce();
    expect(solve).not.toHaveBeenCalled();
  } finally {
    cleanup();
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
    vi.unstubAllGlobals();
  }
});
