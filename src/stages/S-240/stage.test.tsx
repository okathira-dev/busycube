// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { consumeReturnedShare, prepareShareAttempt } from "./shareReceipt";
import { stage } from "./stage";

vi.mock("./shareReceipt", () => ({
  consumeReturnedShare: vi.fn(),
  prepareShareAttempt: vi.fn(),
}));
const previousShare = Object.getOwnPropertyDescriptor(navigator, "share");
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
beforeEach(() => {
  vi.mocked(consumeReturnedShare).mockResolvedValue(false);
  vi.mocked(prepareShareAttempt).mockResolvedValue(
    "12345678-1234-4321-8765-123456789abc",
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  if (previousShare) Object.defineProperty(navigator, "share", previousShare);
  else Reflect.deleteProperty(navigator, "share");
});
it("does not treat a successful share or the legacy URL as a returned mark", async () => {
  history.replaceState(null, "", "/?stage=S-240&share-target=1&text=private");
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  const p = props();
  await act(async () => {
    render(<stage.Component {...p} />);
  });
  expect(location.search).toBe("?stage=S-240");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share the mark" }));
  });
  expect(share).toHaveBeenCalledWith({
    title: "Busycube",
    text: "busycube:S240:12345678-1234-4321-8765-123456789abc",
  });
  expect(screen.getByRole("status").textContent).toBe("Waiting");
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
it("solves only after consuming a returned receipt and does not prepare another attempt", async () => {
  vi.mocked(consumeReturnedShare).mockResolvedValue(true);
  const p = props();
  await act(async () => {
    render(<stage.Component {...p} />);
  });
  for (const box of Object.values(p.boxes))
    expect(box.solve).toHaveBeenCalledOnce();
  expect(prepareShareAttempt).not.toHaveBeenCalled();
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  for (const box of Object.values(p.boxes))
    expect(box.solve).toHaveBeenCalledOnce();
});
it("ignores a returned receipt resolved after departure", async () => {
  let complete: ((value: boolean) => void) | undefined;
  vi.mocked(consumeReturnedShare).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  view.unmount();
  await act(async () => {
    complete?.(true);
  });
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
