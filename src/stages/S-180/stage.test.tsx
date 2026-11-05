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

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
afterEach(() => {
  cleanup();
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else Reflect.deleteProperty(navigator, "clipboard");
});
function setup(clipboard: {
  writeText(value: string): Promise<void>;
  readText(): Promise<string>;
}) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
  const solve = vi.fn();
  const props: StageComponentProps = {
    locale: "en",
    signal: new AbortController().signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  render(<stage.Component {...props} />);
  return solve;
}
it("requires an actual completed write and exact read, without exposing clipboard contents", async () => {
  let value = "busycube";
  const writeText = vi.fn(async (next: string) => {
    value = next;
  });
  const readText = vi.fn(async () => value);
  const solve = setup({ writeText, readText });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Paste:/ }));
  });
  expect(solve).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  });
  expect(writeText).toHaveBeenCalledWith("ebucysub");
  expect(screen.queryByText("ebucysub")).toBeNull();
  value = "busycube\n";
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Paste:/ }));
  });
  expect(solve).not.toHaveBeenCalled();
  value = "busycube";
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Paste:/ }));
  });
  expect(solve).toHaveBeenCalledOnce();
});
it("does not retroactively authorize a read that began before the write finished", async () => {
  let release: ((value: string) => void) | undefined;
  const read = new Promise<string>((resolve) => {
    release = resolve;
  });
  const solve = setup({ writeText: async () => {}, readText: () => read });
  fireEvent.click(screen.getByRole("button", { name: /^Paste:/ }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  });
  await act(async () => {
    release?.("busycube");
    await read;
  });
  expect(solve).not.toHaveBeenCalled();
});
