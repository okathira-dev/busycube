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

class Otp {
  type = "otp";
  constructor(public code: string) {}
}
const previous = Object.getOwnPropertyDescriptor(navigator, "credentials");
const get = vi.fn();
function fixture() {
  const definition = stage.boxes.B01;
  if (!definition) throw new Error("Missing box");
  const solve = vi.fn();
  const controller = new AbortController();
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: { B01: { id: "B01", definition, state: "ribboned", solve } },
    services: {},
    progress: { hasMarker: () => false, mark: vi.fn() },
  };
  return { p, solve, controller };
}
function code() {
  const value = document
    .querySelector(".s750-sms")
    ?.textContent?.match(/#(\d{6})$/)?.[1];
  if (!value) throw new Error("No SMS code");
  return value;
}
const start = () =>
  act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^SMS speech bubble:/ }),
    );
  });
beforeEach(() => {
  vi.stubGlobal("OTPCredential", Otp);
  Object.defineProperty(navigator, "credentials", {
    configurable: true,
    value: { get },
  });
  get.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  get.mockReset();
  if (previous) Object.defineProperty(navigator, "credentials", previous);
  else Reflect.deleteProperty(navigator, "credentials");
});

it("waits only from the box with SMS transport and an abort signal; normal input/paste/synthetic input never opens", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  expect(get).not.toHaveBeenCalled();
  const input = screen.getByRole("textbox", { name: "One-time code" });
  fireEvent.input(input, { target: { value: code() } });
  expect(f.solve).not.toHaveBeenCalled();
  await start();
  expect(get).toHaveBeenCalledOnce();
  expect(get.mock.calls[0]?.[0]).toMatchObject({ otp: { transport: ["sms"] } });
  expect(get.mock.calls[0]?.[0].signal).toBeInstanceOf(AbortSignal);
  expect((input as HTMLInputElement).value).toBe("");
  vi.spyOn(HTMLInputElement.prototype, "matches").mockReturnValue(true);
  fireEvent.paste(input);
  fireEvent.input(input, { target: { value: code() } });
  expect(f.solve).not.toHaveBeenCalled();
});

it("requires a real credential of the expected class/type and matching current code, then opens once", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  get.mockResolvedValueOnce({ type: "otp", code: code() });
  await start();
  expect(f.solve).not.toHaveBeenCalled();
  get.mockResolvedValueOnce(new Otp("not-the-code"));
  await start();
  expect(f.solve).not.toHaveBeenCalled();
  get.mockResolvedValueOnce(new Otp(code()));
  await start();
  expect(f.solve).toHaveBeenCalledOnce();
  expect(
    (screen.getByRole("textbox", { name: "One-time code" }) as HTMLInputElement)
      .value,
  ).toBe(code());
  expect(get.mock.calls.at(-1)?.[0].signal.aborted).toBe(true);
  get.mockResolvedValueOnce(new Otp(code()));
  await start();
  expect(f.solve).toHaveBeenCalledOnce();
});

it("new code and a second box request cancel older attempts, whose late matching replies cannot win", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  let finish = (_value: Otp) => {};
  get.mockImplementationOnce(
    () =>
      new Promise<Otp>((resolve) => {
        finish = resolve;
      }),
  );
  const old = code();
  await start();
  const signal = get.mock.calls[0]?.[0].signal;
  fireEvent.click(screen.getByRole("button", { name: "New code" }));
  expect(signal.aborted).toBe(true);
  await act(async () => finish(new Otp(old)));
  expect(f.solve).not.toHaveBeenCalled();
  await start();
  const next = get.mock.calls.at(-1)?.[0].signal;
  await start();
  expect(next.aborted).toBe(true);
  expect(f.solve).not.toHaveBeenCalled();
});

it("aborts on signal or unmount and ignores late credential results", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  let finish = (_value: Otp) => {};
  get.mockImplementationOnce(
    () =>
      new Promise<Otp>((resolve) => {
        finish = resolve;
      }),
  );
  const value = code();
  await start();
  const signal = get.mock.calls[0]?.[0].signal;
  f.controller.abort();
  expect(signal.aborted).toBe(true);
  view.unmount();
  await act(async () => finish(new Otp(value)));
  expect(f.solve).not.toHaveBeenCalled();
});

it("API rejection or absence remains uncompleted and never requests or stores a phone number", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  get.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
  await start();
  expect(f.solve).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("Denied");
  vi.stubGlobal("OTPCredential", undefined);
  await start();
  expect(get).toHaveBeenCalledOnce();
  expect(f.solve).not.toHaveBeenCalled();
  expect(view.container.querySelector('input[type="tel"]')).toBeNull();
  expect(view.container.textContent).not.toMatch(
    /send this|phone number|collaborator|料金|電話番号/,
  );
});
