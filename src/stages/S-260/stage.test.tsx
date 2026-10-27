// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage } from "./stage";

function props(): StageComponentProps {
  return {
    locale: "en",
    signal: new AbortController().signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("starts only from the neutral-coloured box, shows the sample, and requires exact normalized colour", async () => {
  const colours = ["#a78bf9", " #a78bfa", "#A78BFA"];
  const open = vi.fn(async () => ({ sRGBHex: colours.shift() ?? "" }));
  vi.stubGlobal(
    "EyeDropper",
    class {
      open = open;
    },
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(view.container.querySelector("output")).toBeNull();
  expect(view.container.querySelector(".eyedropper-target")).toBeNull();
  const boxColour = view.container
    .querySelector<HTMLElement>(".gift-box")
    ?.style.getPropertyValue("--gift-color");
  expect(boxColour).toMatch(/^#[0-9a-f]{6}$/);
  expect(boxColour).not.toBe("#a78bfa");
  const box = screen.getByRole("button", { name: /^Eyedropper:/ });
  for (const expected of ["Read", "Invalid"]) {
    await act(async () => {
      fireEvent.click(box);
    });
    expect(
      view.container.querySelector(".interaction-status")?.textContent,
    ).toBe(expected);
    for (const problem of Object.values(p.boxes))
      expect(problem.solve).not.toHaveBeenCalled();
  }
  await act(async () => {
    fireEvent.click(box);
  });
  expect(view.container.querySelector("output")?.textContent).toBe("#a78bfa");
  expect(
    view.container.querySelector<HTMLElement>(".s260-swatch")?.style
      .backgroundColor,
  ).toBe("rgb(167, 139, 250)");
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).toHaveBeenCalledOnce();
});
it("aborts the actual picker signal on departure and ignores late results", async () => {
  let pickerSignal: AbortSignal | undefined;
  let complete: ((result: { sRGBHex: string }) => void) | undefined;
  const open = vi.fn(({ signal }: { signal: AbortSignal }) => {
    pickerSignal = signal;
    return new Promise<{ sRGBHex: string }>((resolve) => {
      complete = resolve;
    });
  });
  vi.stubGlobal(
    "EyeDropper",
    class {
      open = open;
    },
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  fireEvent.click(screen.getByRole("button", { name: /^Eyedropper:/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Eyedropper:/ }));
  expect(open).toHaveBeenCalledOnce();
  view.unmount();
  expect(pickerSignal?.aborted).toBe(true);
  await act(async () => {
    complete?.({ sRGBHex: "#a78bfa" });
  });
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
});
it("keeps cancellation distinct from unsupported and never solves", async () => {
  const p = props();
  vi.stubGlobal(
    "EyeDropper",
    class {
      open() {
        return Promise.reject(new DOMException("cancel", "AbortError"));
      }
    },
  );
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Eyedropper:/ }));
  });
  expect(screen.getByRole("status").textContent).toBe("Cancelled");
  vi.stubGlobal("EyeDropper", undefined);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Eyedropper:/ }));
  });
  expect(screen.getByRole("status").textContent).toBe("Unavailable");
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
});
