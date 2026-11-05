// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { mediaRequirements, stage } from "./stage";

it("uses initial matches and later media changes, keeps density one unmatched, and releases all listeners", () => {
  const queries = new Map<
    string,
    EventTarget & { media: string; matches: boolean }
  >(
    mediaRequirements.map(({ query }) => [
      query,
      Object.assign(new EventTarget(), {
        media: query,
        matches:
          query === "(orientation: landscape)" ||
          query === "(prefers-color-scheme: dark)",
      }),
    ]),
  );
  const previous = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => queries.get(query),
  });
  const controller = new AbortController();
  const props: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  try {
    render(<stage.Component {...props} />);
    expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
    expect(props.boxes.B07?.solve).toHaveBeenCalledOnce();
    expect(props.boxes.B08?.solve).not.toHaveBeenCalled();
    expect(props.boxes.B09?.solve).not.toHaveBeenCalled();
    expect(props.boxes.B04?.solve).not.toHaveBeenCalled();
    const transparency = queries.get("(prefers-reduced-transparency: reduce)");
    if (!transparency) throw new Error("missing fixture query");
    transparency.matches = true;
    act(() => transparency.dispatchEvent(new Event("change")));
    expect(props.boxes.B04?.solve).toHaveBeenCalledOnce();
    act(() => window.dispatchEvent(new Event("beforeprint")));
    expect(props.boxes.B10?.solve).toHaveBeenCalledOnce();
    cleanup();
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
      transparency.dispatchEvent(new Event("change"));
    });
    expect(props.boxes.B10?.solve).toHaveBeenCalledOnce();
    expect(props.boxes.B04?.solve).toHaveBeenCalledOnce();
  } finally {
    cleanup();
    if (previous) Object.defineProperty(window, "matchMedia", previous);
    else Reflect.deleteProperty(window, "matchMedia");
  }
});
