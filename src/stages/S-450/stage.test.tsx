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
import {
  type Entrance,
  gameUri,
  handlerTemplate,
  pendingKeys,
  receipt,
} from "./protocol";
import { stage } from "./stage";

const round = "11111111-1111-4111-8111-111111111111";
const register = vi.fn();
const unregister = vi.fn();
let consumer: (params: LaunchParams) => void;
let app = false;
const previousQueue = Object.getOwnPropertyDescriptor(window, "launchQueue");
const previousRegister = Object.getOwnPropertyDescriptor(
  navigator,
  "registerProtocolHandler",
);
const previousUnregister = Object.getOwnPropertyDescriptor(
  navigator,
  "unregisterProtocolHandler",
);
function fixture() {
  const controller = new AbortController();
  const solves = { B01: vi.fn(), B02: vi.fn() };
  const boxes = Object.fromEntries(
    Object.entries(stage.boxes).map(([id, definition]) => [
      id,
      {
        id,
        definition,
        state: "ribboned" as const,
        solve: solves[id as keyof typeof solves],
      },
    ]),
  );
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes,
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  return { p, solves, controller };
}
function target(entrance: Entrance, value = round) {
  const url = new URL("/?stage=S-450", location.origin);
  url.searchParams.set("entry", entrance);
  url.searchParams.set("protocol", gameUri(entrance, value));
  return url.href;
}
const send = async (entrance: Entrance, value = round) =>
  act(async () => consumer({ targetURL: target(entrance, value), files: [] }));
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/?stage=S-450");
  app = false;
  vi.spyOn(crypto, "randomUUID").mockReturnValue(round);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: app && query === "(display-mode: standalone)",
  }));
  Object.defineProperty(window, "launchQueue", {
    configurable: true,
    value: {
      setConsumer: (callback: typeof consumer) => {
        consumer = callback;
      },
    },
  });
  Object.defineProperty(navigator, "registerProtocolHandler", {
    configurable: true,
    value: register,
  });
  Object.defineProperty(navigator, "unregisterProtocolHandler", {
    configurable: true,
    value: unregister,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  register.mockReset();
  unregister.mockReset();
  for (const [object, key, old] of [
    [window, "launchQueue", previousQueue],
    [navigator, "registerProtocolHandler", previousRegister],
    [navigator, "unregisterProtocolHandler", previousUnregister],
  ] as const) {
    if (old) Object.defineProperty(object, key, old);
    else Reflect.deleteProperty(object, key);
  }
});

it("registers nothing on entry, and the custom box uses only the PWA scheme with an explicit app-entrance link", () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  expect(register).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKeys.app)).toBeNull();
  expect(
    screen.getByRole("link", { name: "App entrance" }).getAttribute("href"),
  ).toBe("/?stage=S-080");
  fireEvent.click(
    screen.getByRole("button", { name: /^Arrow leaving a square:/ }),
  );
  expect(register).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKeys.app)).toBe(round);
  expect(
    screen.getByRole("link", { name: "web+busycube:" }).getAttribute("href"),
  ).toBe(gameUri("app", round));
  expect(f.solves.B01).not.toHaveBeenCalled();
});

it("requires both the matching custom receipt and actual app display, never a browser receipt or elapsed wait", async () => {
  const f = fixture();
  localStorage.setItem(pendingKeys.app, round);
  render(<stage.Component {...f.p} />);
  await send("app");
  expect(f.solves.B01).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKeys.app)).toBe(round);
  app = true;
  await send("app", "22222222-2222-4222-8222-222222222222");
  expect(f.solves.B01).not.toHaveBeenCalled();
  await send("app");
  expect(f.solves.B01).toHaveBeenCalledOnce();
  expect(f.solves.B02).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKeys.app)).toBeNull();
  await send("app");
  expect(f.solves.B01).toHaveBeenCalledOnce();
});

it("registers only wtai from its box and requires a later matching game URI instead of registration success", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  fireEvent.click(screen.getByRole("button", { name: /^Chain links:/ }));
  expect(register).toHaveBeenCalledExactlyOnceWith(
    "wtai",
    handlerTemplate(location.origin),
  );
  expect(screen.getByRole("link", { name: "wtai:" }).getAttribute("href")).toBe(
    gameUri("browser", round),
  );
  expect(f.solves.B02).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKeys.app)).toBeNull();
  await send("browser");
  expect(f.solves.B02).toHaveBeenCalledOnce();
  expect(f.solves.B01).not.toHaveBeenCalled();
});

it("accepts a cold-launch URL once across StrictMode, consumes the pending state and removes the receipt from the address bar", () => {
  localStorage.setItem(pendingKeys.browser, round);
  history.replaceState(null, "", target("browser"));
  const f = fixture();
  render(
    <StrictMode>
      <stage.Component {...f.p} />
    </StrictMode>,
  );
  expect(f.solves.B02).toHaveBeenCalledOnce();
  expect(localStorage.getItem(pendingKeys.browser)).toBeNull();
  expect(new URL(location.href).searchParams.has("protocol")).toBe(false);
});

it("keeps API rejection and unavailable registration uncompleted, with no fake pending round", () => {
  register.mockImplementationOnce(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  const f = fixture();
  render(<stage.Component {...f.p} />);
  fireEvent.click(screen.getByRole("button", { name: /^Chain links:/ }));
  expect(localStorage.getItem(pendingKeys.browser)).toBeNull();
  expect(f.solves.B02).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: "wtai:" })).toBeNull();
  Object.defineProperty(navigator, "registerProtocolHandler", {
    configurable: true,
    value: undefined,
  });
  fireEvent.click(screen.getByRole("button", { name: /^Chain links:/ }));
  expect(f.solves.B02).not.toHaveBeenCalled();
});

it("unregisters only this browser handler on explicit cleanup and does not auto-remove it on departure", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  fireEvent.click(screen.getByRole("button", { name: /^Chain links:/ }));
  localStorage.setItem(pendingKeys.app, round);
  fireEvent.click(
    screen.getByRole("button", { name: "Remove the wtai handler" }),
  );
  expect(unregister).toHaveBeenCalledExactlyOnceWith(
    "wtai",
    handlerTemplate(location.origin),
  );
  expect(localStorage.getItem(pendingKeys.browser)).toBeNull();
  expect(localStorage.getItem(pendingKeys.app)).toBe(round);
  view.unmount();
  expect(unregister).toHaveBeenCalledOnce();
  await send("app");
  expect(f.solves.B01).not.toHaveBeenCalled();
});

it("rejects encoded-twice/wrong-origin/ambiguous/call-command receipts without changing pending state", () => {
  const good = target("browser");
  expect(receipt(good, location.origin)).toEqual({
    entrance: "browser",
    round,
  });
  for (const url of [
    good.replace(location.origin, "https://other.invalid"),
    `${good}&entry=app`,
    `${good}&stage=S-080`,
    good.replace("wtai%3Abusycube", "wtai%253Abusycube"),
    good.replace("wtai%3Abusycube", "wtai%3A%2F%2Fwp%2Fmc%3B1234"),
    target("app").replace("entry=app", "entry=browser"),
    "invalid",
  ])
    expect(receipt(url, location.origin)).toBeNull();
});
