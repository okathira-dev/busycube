// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import type { GoogleId } from "./identity";
import { stage } from "./stage";

const load = vi.hoisted(() => vi.fn());
vi.mock("./identity", () => ({ loadIdentity: load }));
let callback: Parameters<GoogleId["initialize"]>[0]["callback"];
let moment: Parameters<GoogleId["prompt"]>[0];
const id = {
  initialize: vi.fn<GoogleId["initialize"]>((options) => {
    callback = options.callback;
  }),
  prompt: vi.fn<GoogleId["prompt"]>((value) => {
    moment = value;
  }),
  cancel: vi.fn(),
};
function fixture() {
  const definition = stage.boxes.B01;
  if (!definition) throw new Error("No box");
  const controller = new AbortController();
  const solve = vi.fn();
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: { B01: { id: "B01", definition, state: "ribboned", solve } },
    services: {},
    progress: { hasMarker: () => false, mark: vi.fn() },
  };
  return { p, solve, controller };
}
const start = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Identity card:/ }));
  });
beforeEach(() => {
  vi.stubEnv(
    "VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID",
    "fixture.apps.googleusercontent.com",
  );
  vi.stubGlobal("IdentityCredential", class {});
  load.mockResolvedValue(id);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  load.mockReset();
  id.initialize.mockClear();
  id.prompt.mockClear();
  id.cancel.mockClear();
});

it("starts only from the box, keeps one manual FedCM callback condition and never decodes/displays/stores/forwards the token", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  const atob = vi.spyOn(window, "atob");
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const network = vi.spyOn(globalThis, "fetch");
  const log = vi.spyOn(console, "log");
  expect(load).not.toHaveBeenCalled();
  expect(id.cancel).not.toHaveBeenCalled();
  await start();
  expect(id.initialize).toHaveBeenCalledWith(
    expect.objectContaining({
      auto_select: false,
      client_id: "fixture.apps.googleusercontent.com",
    }),
  );
  expect(id.prompt).toHaveBeenCalledOnce();
  const token = "opaque-sample-do-not-decode";
  await act(async () => callback({ select_by: "fedcm", credential: token }));
  expect(f.solve).toHaveBeenCalledOnce();
  expect(view.container.textContent).not.toContain(token);
  expect(atob).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  expect(log).not.toHaveBeenCalled();
  await act(async () => callback({ select_by: "fedcm", credential: token }));
  expect(f.solve).toHaveBeenCalledOnce();
});

it.each(["fedcm_auto", "user", "btn", undefined])(
  "never accepts %s or a stale result after retry",
  async (select_by) => {
    const f = fixture();
    render(<stage.Component {...f.p} />);
    await start();
    const old = callback;
    await act(async () => old({ select_by, credential: "opaque" }));
    expect(f.solve).not.toHaveBeenCalled();
    await start();
    await act(async () => old({ select_by: "fedcm", credential: "opaque" }));
    expect(f.solve).not.toHaveBeenCalled();
  },
);

it("cancels the owned chooser explicitly and on leave, while empty tokens and moment notifications never win", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  await start();
  await act(async () => callback({ select_by: "fedcm", credential: "" }));
  expect(f.solve).not.toHaveBeenCalled();
  await start();
  await act(async () => moment?.({ isDismissedMoment: () => true }));
  expect(id.cancel).toHaveBeenCalledOnce();
  expect(f.solve).not.toHaveBeenCalled();
  await start();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(id.cancel).toHaveBeenCalledTimes(2);
  await start();
  const current = callback;
  f.controller.abort();
  view.unmount();
  expect(id.cancel).toHaveBeenCalledTimes(3);
  await act(async () => current({ select_by: "fedcm", credential: "opaque" }));
  expect(f.solve).not.toHaveBeenCalled();
});

it("aborts pending SDK loading, so late loading cannot initialize or prompt after cancellation or departure", async () => {
  let finish = (_id: GoogleId) => {};
  load.mockImplementationOnce(
    () =>
      new Promise<GoogleId>((resolve) => {
        finish = resolve;
      }),
  );
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await start();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(load.mock.calls[0]?.[0].aborted).toBe(true);
  await act(async () => finish(id));
  expect(id.initialize).not.toHaveBeenCalled();
  expect(id.prompt).not.toHaveBeenCalled();
  expect(f.solve).not.toHaveBeenCalled();
});

it("does not load on missing configuration or missing API, and stays closed on SDK failure", async () => {
  vi.stubEnv("VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID", "");
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  await start();
  expect(load).not.toHaveBeenCalled();
  view.unmount();
  vi.stubEnv(
    "VITE_BUSYCUBE_FEDCM_GOOGLE_CLIENT_ID",
    "fixture.apps.googleusercontent.com",
  );
  Reflect.deleteProperty(window, "IdentityCredential");
  const next = fixture();
  const second = render(<stage.Component {...next.p} />);
  await start();
  expect(load).not.toHaveBeenCalled();
  second.unmount();
  vi.stubGlobal("IdentityCredential", class {});
  load.mockRejectedValueOnce(new Error("Network"));
  const third = fixture();
  render(<stage.Component {...third.p} />);
  await start();
  expect(third.solve).not.toHaveBeenCalled();
  expect(id.prompt).not.toHaveBeenCalled();
});
