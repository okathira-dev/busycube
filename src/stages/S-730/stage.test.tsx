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

const rendering = vi.hoisted(() => {
  const views: {
    start: ReturnType<typeof vi.fn<() => Promise<void>>>;
    dispose: ReturnType<typeof vi.fn>;
  }[] = [];
  const create = vi.fn(
    (
      _session: XRSession,
      _canvas: HTMLCanvasElement,
      _ar: boolean,
      _selected: () => void,
      _error: () => void,
    ) => {
      const view = { start: vi.fn(async () => {}), dispose: vi.fn() };
      views.push(view);
      return view;
    },
  );
  return { create, views };
});
vi.mock("./xrRenderer", () => ({ createXrView: rendering.create }));
const previous = Object.getOwnPropertyDescriptor(navigator, "xr");
class Session extends EventTarget {
  end = vi.fn(async () => {
    this.dispatchEvent(new Event("end"));
  });
}
function fixture() {
  const session = new Session();
  const xr = Object.assign(new EventTarget(), {
    isSessionSupported: vi.fn(
      async (mode: XRSessionMode) => mode === "immersive-vr",
    ),
    requestSession: vi.fn(async () => session as unknown as XRSession),
  });
  Object.defineProperty(navigator, "xr", { configurable: true, value: xr });
  vi.stubGlobal("isSecureContext", true);
  const p: StageComponentProps = {
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
  return { p, session, xr };
}
async function show(p: StageComponentProps) {
  const view = render(<stage.Component {...p} />);
  await act(async () => {});
  return view;
}
afterEach(() => {
  cleanup();
  if (previous) Object.defineProperty(navigator, "xr", previous);
  else Reflect.deleteProperty(navigator, "xr");
  vi.unstubAllGlobals();
  rendering.create.mockClear();
  rendering.views.length = 0;
});

it("starts only from the XR icon, keeps one box closed through pose/render setup, and ends explicitly", async () => {
  const f = fixture();
  await show(f.p);
  expect(document.querySelectorAll(".gift-box")).toHaveLength(1);
  expect(f.xr.requestSession).not.toHaveBeenCalled();
  const supportCalls = f.xr.isSessionSupported.mock.calls.length;
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Enter immersive XR" }));
  });
  expect(f.xr.requestSession).toHaveBeenCalledWith("immersive-vr", {
    requiredFeatures: ["local"],
  });
  expect(f.xr.isSessionSupported.mock.calls).toHaveLength(supportCalls);
  expect(rendering.create).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toBe("XR is active.");
  fireEvent.click(screen.getByLabelText("Immersive XR view"));
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "End XR" }));
  });
  expect(f.session.end).toHaveBeenCalledOnce();
  expect(rendering.views[0]?.dispose).toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("The XR session ended.");
});

it("ignores late session permission after cancelling and prevents duplicate requests", async () => {
  const f = fixture();
  let resolve: ((session: XRSession) => void) | undefined;
  f.xr.requestSession.mockImplementation(
    () =>
      new Promise((complete) => {
        resolve = complete;
      }),
  );
  await show(f.p);
  await act(async () => {
    const button = screen.getByRole("button", { name: "Enter immersive XR" });
    fireEvent.click(button);
    fireEvent.click(button);
  });
  expect(f.xr.requestSession).toHaveBeenCalledOnce();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "End XR" }));
  });
  await act(async () => {
    resolve?.(f.session as unknown as XRSession);
  });
  expect(f.session.end).toHaveBeenCalledOnce();
  expect(rendering.create).not.toHaveBeenCalled();
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
});

it("ends a late session after unmount without initializing rendering", async () => {
  const f = fixture();
  let resolve: ((session: XRSession) => void) | undefined;
  f.xr.requestSession.mockImplementation(
    () =>
      new Promise((complete) => {
        resolve = complete;
      }),
  );
  const view = await show(f.p);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Enter immersive XR" }));
  });
  view.unmount();
  await act(async () => {
    resolve?.(f.session as unknown as XRSession);
  });
  expect(f.session.end).toHaveBeenCalledOnce();
  expect(rendering.create).not.toHaveBeenCalled();
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
});

it("cleans up when the platform ends the session and does not end it twice", async () => {
  const f = fixture();
  const view = await show(f.p);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Enter immersive XR" }));
  });
  await act(async () => {
    f.session.dispatchEvent(new Event("end"));
  });
  view.unmount();
  expect(f.session.end).not.toHaveBeenCalled();
  expect(rendering.views[0]?.dispose).toHaveBeenCalled();
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
});

it("reports cancellation and setup failure without solving and closes failed sessions", async () => {
  const f = fixture();
  f.xr.requestSession.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await show(f.p);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Enter immersive XR" }));
  });
  expect(screen.getByRole("status").textContent).toBe(
    "XR entry was cancelled or denied.",
  );
  rendering.create.mockImplementationOnce(() => {
    throw new Error("WebGL initialization failed");
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Enter immersive XR" }));
  });
  expect(f.session.end).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toBe(
    "XR could not start or continue.",
  );
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
});

it("keeps unsupported XR unachieved and detects a newly connected AR device", async () => {
  const f = fixture();
  f.xr.isSessionSupported.mockResolvedValue(false);
  await show(f.p);
  expect(screen.getByRole("status").textContent).toBe(
    "No immersive AR or VR device is available.",
  );
  expect(f.xr.requestSession).not.toHaveBeenCalled();
  f.xr.isSessionSupported.mockImplementation(
    async (mode) => mode === "immersive-ar",
  );
  await act(async () => {
    f.xr.dispatchEvent(new Event("devicechange"));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Enter immersive XR" }));
  });
  expect(f.xr.requestSession).toHaveBeenCalledWith("immersive-ar", {
    requiredFeatures: ["local"],
  });
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
});
