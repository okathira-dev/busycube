// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import type { ContentState } from "./client";
import { stage } from "./stage";

const mocks = vi.hoisted(() => ({ connect: vi.fn(), request: vi.fn() }));
vi.mock("./client", async (original) => ({
  ...(await original<typeof import("./client")>()),
  contentWorker: mocks.connect,
  contentRequest: mocks.request,
}));
let state: ContentState;
const id = "busycube-s970-11111111-1111-4111-8111-111111111111";
function fixture(saved = false) {
  const controller = new AbortController(),
    b1 = vi.fn(),
    b2 = vi.fn();
  const definition1 = stage.boxes.B01,
    definition2 = stage.boxes.B02;
  if (!definition1 || !definition2) throw new Error("Missing boxes");
  const props: StageComponentProps = {
    signal: controller.signal,
    locale: "en",
    services: {},
    progress: { hasMarker: () => false, mark: vi.fn() },
    boxes: {
      B01: {
        id: "B01",
        definition: definition1,
        state: saved ? "closed" : "ribboned",
        solve: b1,
      },
      B02: {
        id: "B02",
        definition: definition2,
        state: saved ? "closed" : "ribboned",
        solve: b2,
      },
    },
  };
  return { props, controller, b1, b2 };
}
beforeEach(() => {
  state = {
    id: null,
    status: "idle",
    saved: false,
    openId: null,
    deleteId: null,
    cleanupPending: false,
  };
  mocks.connect.mockResolvedValue({ registration: {}, worker: {} });
  mocks.request.mockImplementation(async (_worker, action: string) => {
    if (action === "save")
      state = { ...state, id, status: "saved", saved: true };
    return state;
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("reads on entry and saves/registers only on the explicit save action, with no page link or delete control and no save-only credit", async () => {
  const f = fixture();
  await act(async () => {
    render(<stage.Component {...f.props} />);
  });
  expect(mocks.request).toHaveBeenCalledExactlyOnceWith(
    {},
    "read",
    expect.any(AbortSignal),
    "en",
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Save page" })),
  );
  expect(mocks.request).toHaveBeenLastCalledWith(
    {},
    "save",
    expect.any(AbortSignal),
    "en",
  );
  expect(f.b1).not.toHaveBeenCalled();
  expect(f.b2).not.toHaveBeenCalled();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getAllByRole("button")).toHaveLength(1);
});
it("receives two distinct actions with the same saved-item ID once each, and preserves saved history on revisit", async () => {
  state = {
    id,
    status: "deleted",
    saved: true,
    openId: id,
    deleteId: id,
    cleanupPending: false,
  };
  const f = fixture();
  await act(async () => {
    render(<stage.Component {...f.props} />);
  });
  expect(f.b1).toHaveBeenCalledOnce();
  expect(f.b2).toHaveBeenCalledOnce();
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(f.b1).toHaveBeenCalledOnce();
  expect(f.b2).toHaveBeenCalledOnce();
  cleanup();
  const historical = fixture(true);
  await act(async () => {
    render(<stage.Component {...historical.props} />);
  });
  expect(historical.b1).not.toHaveBeenCalled();
  expect(historical.b2).not.toHaveBeenCalled();
});
it("ignores a late save/read after departure and cannot use a failed save as either achievement", async () => {
  const f = fixture();
  await act(async () => {
    render(<stage.Component {...f.props} />);
  });
  let release: ((value: ContentState) => void) | undefined;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise<ContentState>((resolve) => {
        release = resolve;
      }),
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Save page" })),
  );
  const signal = mocks.request.mock.calls.at(-1)?.[2] as AbortSignal;
  await act(async () => {
    f.controller.abort();
    release?.({
      id,
      status: "deleted",
      saved: true,
      openId: id,
      deleteId: id,
      cleanupPending: false,
    });
  });
  expect(signal.aborted).toBe(true);
  expect(f.b1).not.toHaveBeenCalled();
  expect(f.b2).not.toHaveBeenCalled();
  cleanup();
  const next = fixture();
  mocks.request.mockRejectedValue(new Error("Unavailable"));
  await act(async () => {
    render(<stage.Component {...next.props} />);
  });
  expect(next.b1).not.toHaveBeenCalled();
  expect(next.b2).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("Unavailable");
});
