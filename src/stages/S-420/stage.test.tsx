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
import { stage } from "./stage";
import type { VaultSnapshot } from "./vaultClient";

const backend = vi.hoisted(() => ({
  worker: { postMessage: vi.fn() },
  ready: vi.fn(),
  request:
    vi.fn<
      (
        _worker: ServiceWorker,
        action: string,
        nonce: string,
        installationId: string,
        locale: string,
        signal: AbortSignal,
      ) => Promise<VaultSnapshot | null>
    >(),
}));
vi.mock("./vaultClient", async (original) => ({
  ...(await original<typeof import("./vaultClient")>()),
  vaultWorker: backend.ready,
  vaultRequest: backend.request,
}));
const savedWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
class Container extends EventTarget {
  listeners = new Set<EventListenerOrEventListenerObject>();
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    super.addEventListener(type, listener, options);
    if (type === "message" && listener) this.listeners.add(listener);
  }
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    super.removeEventListener(type, listener, options);
    if (type === "message" && listener) this.listeners.delete(listener);
  }
  hint(nonce: string, trusted = true) {
    const event = {
      isTrusted: trusted,
      source: backend.worker,
      data: { type: "busycube-vault-v1", nonce },
    } as unknown as Event;
    for (const listener of this.listeners) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}
function state(
  nonce: string,
  input = "",
  phase: VaultSnapshot["phase"] = "active",
  revision = 1,
  won = false,
): VaultSnapshot {
  return {
    nonce,
    input,
    phase,
    revision,
    verdict: phase === "ended" ? Array.from(input, () => true) : null,
    won,
  };
}
function fixture() {
  const container = new Container();
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: container,
  });
  const permission = vi.fn(
    async (): Promise<NotificationPermission> => "granted",
  );
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: permission,
  });
  const abort = new AbortController();
  const p: StageComponentProps = {
    locale: "en",
    signal: abort.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: { installationId: "vault-installation" },
  };
  return { container, permission, abort, p };
}
beforeEach(() => {
  backend.ready.mockResolvedValue(backend.worker);
  backend.request.mockImplementation(async (_worker, _action, nonce) =>
    state(nonce),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  backend.ready.mockReset();
  backend.request.mockReset();
  backend.worker.postMessage.mockReset();
  if (savedWorker)
    Object.defineProperty(navigator, "serviceWorker", savedWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
  history.replaceState(null, "", "/");
});
const begin = () =>
  act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /^Padlock:/ })),
  );
const startedNonce = () =>
  backend.request.mock.calls.find((call) => call[1] === "start")?.[2] ?? "";

it("starts only from the box and never treats fixed old URL parameters or an unknown receipt as success", async () => {
  history.replaceState(
    null,
    "",
    "/?stage=S-420&vault-attempt=RLLR&notification-sequence=S-410-ok&vault-receipt=wrong",
  );
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await act(async () => {});
  expect(location.search).toBe("?stage=S-420");
  expect(backend.request).not.toHaveBeenCalled();
  expect(f.permission).not.toHaveBeenCalled();
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  expect(screen.getAllByRole("button")).toHaveLength(1);
  await begin();
  expect(backend.request).toHaveBeenCalledWith(
    backend.worker,
    "start",
    expect.any(String),
    "vault-installation",
    "en",
    expect.any(AbortSignal),
  );
});

it("renders all input positions without premature verdicts and ignores synthetic or old hints", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  await begin();
  backend.request.mockImplementation(async (_worker, _action, nonce) =>
    state(nonce, "LRLRLRL", "active", 3),
  );
  await act(async () => {
    f.container.hint(startedNonce(), false);
    f.container.hint("old");
  });
  expect(backend.request).toHaveBeenCalledOnce();
  await act(async () => f.container.hint(startedNonce()));
  expect(view.container.querySelectorAll(".s420-entry")).toHaveLength(7);
  expect(view.container.querySelectorAll(".s420-verdict")).toHaveLength(0);
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  backend.request.mockImplementation(async (_worker, _action, nonce) =>
    state(nonce, "LRLRL", "ended", 4, true),
  );
  await act(async () => f.container.hint(startedNonce()));
  expect(view.container.querySelectorAll(".s420-verdict")).toHaveLength(5);
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
});

it("claims a valid submitted receipt once across StrictMode effect replay, while normal read replies cannot award it", async () => {
  const nonce = "12345678-1234-4321-8765-123456789abc";
  history.replaceState(null, "", `/?stage=S-420&vault-receipt=${nonce}`);
  const f = fixture();
  backend.request.mockImplementation(async (_worker, _action, current) =>
    state(current, "LRLRL", "ended", 10, true),
  );
  render(
    <StrictMode>
      <stage.Component {...f.p} />
    </StrictMode>,
  );
  await act(async () => {});
  expect(
    backend.request.mock.calls.filter((call) => call[1] === "consume"),
  ).toHaveLength(1);
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(location.search).toBe("?stage=S-420");
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
});

it("does not overwrite newer input with an older start response and clears the old trial when a new one starts", async () => {
  const f = fixture();
  let finish: (snapshot: VaultSnapshot) => void = () => {};
  backend.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  await begin();
  const first = startedNonce();
  backend.request.mockImplementation(async (_worker, _action, nonce) =>
    state(nonce, "LRL", "active", 5),
  );
  await act(async () => f.container.hint(first));
  await act(async () => finish(state(first, "", "active", 1)));
  expect(view.container.querySelectorAll(".s420-entry")).toHaveLength(3);
  backend.request.mockImplementation(async (_worker, _action, nonce) =>
    state(nonce),
  );
  await begin();
  expect(view.container.querySelectorAll(".s420-entry")).toHaveLength(0);
  const count = backend.request.mock.calls.length;
  await act(async () => f.container.hint(first));
  expect(backend.request).toHaveBeenCalledTimes(count);
});

it("ignores denied or late permission, cancels owned input on departure, and removes observers", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await begin();
  act(() => f.abort.abort());
  expect(f.container.listeners.size).toBe(0);
  expect(backend.request.mock.calls[0]?.[5].aborted).toBe(true);
  expect(backend.worker.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ action: "cancel", nonce: startedNonce() }),
  );
  cleanup();
  backend.request.mockClear();
  backend.ready.mockClear();
  const denied = fixture();
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: denied.permission,
  });
  denied.permission.mockResolvedValueOnce("denied");
  render(<stage.Component {...denied.p} />);
  await begin();
  expect(denied.permission).toHaveBeenCalledOnce();
  expect(backend.ready).not.toHaveBeenCalled();
  expect(denied.p.boxes.B02?.solve).not.toHaveBeenCalled();
  cleanup();
  const late = fixture();
  let grant: (value: NotificationPermission) => void = () => {};
  late.permission.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: late.permission,
  });
  const view = render(<stage.Component {...late.p} />);
  await begin();
  view.unmount();
  await act(async () => grant("granted"));
  expect(backend.ready).not.toHaveBeenCalled();
});
