// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { StrictMode } from "react";
import type { StageComponentProps } from "../../runtime/stageContract";
import type { GreenhouseView } from "./functions";
import { stage } from "./stage";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  request: vi.fn(),
  register: vi.fn(),
  order: [] as string[],
}));
vi.mock("./functions", async (original) => ({
  ...(await original<typeof import("./functions")>()),
  greenhouse: mocks.connect,
  greenhouseRequest: mocks.request,
}));
const nonce = "11111111-1111-4111-8111-111111111111";
let state: GreenhouseView;
const revoked = vi.fn();
const createUrl = vi.fn(() => "blob:greenhouse");
function fixture() {
  const controller = new AbortController();
  const solve = vi.fn();
  const definition = stage.boxes.B02;
  if (!definition) throw new Error("Missing box");
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    services: {},
    boxes: { B02: { id: "B02", definition, state: "closed", solve } },
    progress: { hasMarker: () => true, mark: vi.fn() },
  };
  return { p, solve, controller };
}
beforeEach(() => {
  state = { nonce: null, phase: "empty", image: null, cleanupPending: false };
  mocks.connect.mockResolvedValue({
    registration: { periodicSync: { register: mocks.register } },
    worker: {},
  });
  mocks.register.mockImplementation(async () => {
    mocks.order.push("register");
  });
  mocks.request.mockImplementation(
    async (_worker, action: string, _signal, trial?: string) => {
      mocks.order.push(action);
      if (action === "prepare")
        state = {
          nonce: trial ?? nonce,
          phase: "seed",
          image: null,
          cleanupPending: false,
        };
      if (action === "arm") state = { ...state, phase: "armed" };
      return state;
    },
  );
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revoked;
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mocks.connect.mockReset();
  mocks.request.mockReset();
  mocks.register.mockReset();
  mocks.order.length = 0;
  revoked.mockClear();
  createUrl.mockClear();
});
const click = (name: RegExp | string) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });

it("only reads on entry, prepares/registers/arms from the box, and replant never clears common progress", async () => {
  const f = fixture();
  await act(async () => render(<stage.Component {...f.p} />));
  expect(mocks.order).toEqual(["read"]);
  expect(mocks.register).not.toHaveBeenCalled();
  await click(/^Pot with a sprout:/);
  expect(mocks.order.slice(-3)).toEqual(["prepare", "register", "arm"]);
  expect(f.solve).not.toHaveBeenCalled();
  expect(state.phase).toBe("armed");
  await click("Replant the flower");
  expect(mocks.order.slice(-3)).toEqual(["prepare", "register", "arm"]);
  expect(f.p.progress.mark).not.toHaveBeenCalled();
  expect(f.p.boxes.B02?.state).toBe("closed");
});
it("requires both a committed bloom and real saved image, once even across StrictMode, and releases URLs", async () => {
  state = {
    nonce,
    phase: "bloom",
    image: new Blob(["<svg/>"], { type: "image/svg+xml" }),
    cleanupPending: true,
  };
  const f = fixture();
  let view: ReturnType<typeof render> | undefined;
  await act(async () => {
    view = render(
      <StrictMode>
        <stage.Component {...f.p} />
      </StrictMode>,
    );
  });
  expect(f.solve).toHaveBeenCalledOnce();
  expect(createUrl).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toBe(
    "Retrying background cleanup",
  );
  view?.unmount();
  expect(revoked).toHaveBeenCalledWith("blob:greenhouse");
});
it("does not open for missing cache content or ordinary waiting, and registration refusal never arms", async () => {
  state = { nonce, phase: "bloom", image: null, cleanupPending: false };
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {});
  expect(f.solve).not.toHaveBeenCalled();
  expect(createUrl).not.toHaveBeenCalled();
  mocks.register.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await click("Replant the flower");
  expect(mocks.order.at(-1)).toBe("prepare");
  expect(state.phase).toBe("seed");
  expect(f.solve).not.toHaveBeenCalled();
  expect(mocks.order.filter((item) => item === "arm")).toHaveLength(0);
  view.unmount();
});
it("ignores a delayed read after leaving without adding an image", async () => {
  const f = fixture();
  let finish = (_value: GreenhouseView) => {};
  mocks.request.mockImplementationOnce(
    () =>
      new Promise<GreenhouseView>((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {});
  f.controller.abort();
  view.unmount();
  await act(async () =>
    finish({
      nonce,
      phase: "bloom",
      image: new Blob(["<svg/>"]),
      cleanupPending: false,
    }),
  );
  expect(f.solve).not.toHaveBeenCalled();
  expect(createUrl).not.toHaveBeenCalled();
});

it("does not arm if registration resolves after the visit has ended", async () => {
  let finish = () => {};
  mocks.register.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {});
  await click(/^Pot with a sprout:/);
  expect(state.phase).toBe("seed");
  f.controller.abort();
  view.unmount();
  await act(async () => finish());
  expect(mocks.order).not.toContain("arm");
  expect(f.solve).not.toHaveBeenCalled();
});
