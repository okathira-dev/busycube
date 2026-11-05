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
import { filePayload, fileRound, fileTarget, pendingKey } from "./fileKey";
import { stage } from "./stage";

const round = "11111111-1111-4111-8111-111111111111";
let consumer: (params: LaunchParams) => void;
const originalQueue = Object.getOwnPropertyDescriptor(window, "launchQueue");
const createUrl = vi.fn((_blob: Blob) => "blob:stage-file");
const revoke = vi.fn();
function fixture() {
  const controller = new AbortController();
  const solve = vi.fn();
  const definition = stage.boxes.B01;
  if (!definition) throw new Error("Missing box");
  const p: StageComponentProps<"B01"> = {
    locale: "en",
    signal: controller.signal,
    boxes: {
      B01: { id: "B01", definition, state: "ribboned", solve },
    },
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  return { p, solve, controller };
}
function params(
  text = filePayload(round),
  name = "key.busycube",
  size = text.length,
  targetURL = `${location.origin}/?stage=S-440`,
): LaunchParams {
  return {
    targetURL,
    files: [
      {
        getFile: vi.fn(async () => ({ name, size, text: async () => text })),
      } as unknown as FileSystemFileHandle,
    ],
  };
}
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(crypto, "randomUUID").mockReturnValue(round);
  Object.defineProperty(window, "launchQueue", {
    configurable: true,
    value: {
      setConsumer: vi.fn((next) => {
        consumer = next;
      }),
    },
  });
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = revoke;
    },
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  createUrl.mockClear();
  revoke.mockClear();
  if (originalQueue)
    Object.defineProperty(window, "launchQueue", originalQueue);
  else Reflect.deleteProperty(window, "launchQueue");
});
const deliver = async (value: LaunchParams) => act(async () => consumer(value));

it("downloads only from the box, uses the fixed filename, replaces the internal round and revokes the object URL", () => {
  vi.useFakeTimers();
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  expect(createUrl).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKey)).toBeNull();
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("key.busycube");
      expect(this.isConnected).toBe(true);
    });
  fireEvent.click(
    screen.getByRole("button", { name: /^File with downward arrow:/ }),
  );
  expect(click).toHaveBeenCalledOnce();
  expect(localStorage.getItem(pendingKey)).toBe(round);
  expect(createUrl.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  expect(f.solve).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledWith("blob:stage-file");
  view.unmount();
  expect(localStorage.getItem(pendingKey)).toBe(round);
  expect(vi.getTimerCount()).toBe(0);
});

it("accepts only a matching real file receipt for the latest saved round, once, including another window's pending trial", async () => {
  localStorage.setItem(pendingKey, round);
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await deliver({
    targetURL: `${location.origin}/?stage=S-440&round=${round}`,
    files: [],
  });
  expect(f.solve).not.toHaveBeenCalled();
  await deliver(params());
  expect(f.solve).toHaveBeenCalledOnce();
  expect(localStorage.getItem(pendingKey)).toBeNull();
  await deliver(params());
  expect(f.solve).toHaveBeenCalledOnce();
});

it("rejects old rounds, malformed/wrong-kind/oversized files, wrong targets and missing pending state", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  await deliver(params());
  expect(f.solve).not.toHaveBeenCalled();
  localStorage.setItem(pendingKey, round);
  for (const input of [
    params("{}"),
    params("{"),
    params(JSON.stringify({ round })),
    params(filePayload("22222222-2222-4222-8222-222222222222")),
    params(filePayload(round), "key.txt"),
    params(filePayload(round), "key.busycube", 4097),
    params(
      filePayload(round),
      "key.busycube",
      100,
      "https://elsewhere.invalid/?stage=S-440",
    ),
  ])
    await deliver(input);
  expect(f.solve).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKey)).toBe(round);
});

it("fails closed on storage and file reading failure and never consumes a late receipt after departure", async () => {
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  fireEvent.click(
    screen.getByRole("button", { name: /^File with downward arrow:/ }),
  );
  expect(createUrl).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toMatch(/error|failed/i);
  localStorage.setItem(pendingKey, round);
  let finish = (_file: File) => {};
  const input = params();
  const handle = input.files[0];
  if (!handle) throw new Error("Missing file");
  vi.mocked(handle.getFile).mockImplementationOnce(
    () =>
      new Promise<File>((resolve) => {
        finish = resolve;
      }),
  );
  await deliver(input);
  view.unmount();
  await act(async () =>
    finish({
      name: "key.busycube",
      size: 100,
      text: async () => filePayload(round),
    } as File),
  );
  expect(f.solve).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKey)).toBe(round);
  await deliver(params());
  expect(f.solve).not.toHaveBeenCalled();
});

it("retains a queued initial file through StrictMode effect replay", async () => {
  localStorage.setItem(pendingKey, round);
  let first = true;
  Object.defineProperty(window, "launchQueue", {
    configurable: true,
    value: {
      setConsumer: (next: (value: LaunchParams) => void) => {
        consumer = next;
        if (first) {
          first = false;
          next(params());
        }
      },
    },
  });
  const f = fixture();
  await act(async () =>
    render(
      <StrictMode>
        <stage.Component {...f.p} />
      </StrictMode>,
    ),
  );
  expect(f.solve).toHaveBeenCalledOnce();
  expect(localStorage.getItem(pendingKey)).toBeNull();
});

it("validates file format and the dedicated handler destination", () => {
  expect(fileRound(filePayload(round))).toBe(round);
  expect(fileRound(filePayload(""))).toBeNull();
  expect(
    fileTarget(`${location.origin}/?stage=S-440&stage=S-080`, location.origin),
  ).toBe(false);
  expect(fileTarget("invalid", location.origin)).toBe(false);
});
