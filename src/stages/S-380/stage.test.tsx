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

class PublicCredential {
  static isConditionalMediationAvailable = vi.fn(async () => true);
  type = "public-key";
  get rawId() {
    throw new Error("Stage must not retain credential contents");
  }
}
const previous = Object.fromEntries(
  ["credentials", "userActivation"].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(navigator, key),
  ]),
);
function fixture() {
  const create = vi.fn<
    (options?: CredentialCreationOptions) => Promise<Credential | null>
  >(async () => new PublicCredential() as unknown as Credential);
  const get = vi.fn<
    (options?: CredentialRequestOptions) => Promise<Credential | null>
  >(async () => new PublicCredential() as unknown as Credential);
  Object.defineProperty(navigator, "credentials", {
    configurable: true,
    value: { create, get },
  });
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    value: { isActive: true },
  });
  const controller = new AbortController();
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  return { create, get, controller, p };
}
beforeEach(() => {
  vi.stubGlobal("PublicKeyCredential", PublicCredential);
  vi.stubGlobal("isSecureContext", true);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  PublicCredential.isConditionalMediationAvailable.mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const [key, descriptor] of Object.entries(previous)) {
    if (descriptor) Object.defineProperty(navigator, key, descriptor);
    else Reflect.deleteProperty(navigator, key);
  }
  Reflect.deleteProperty(document, "visibilityState");
  Reflect.deleteProperty(document, "permissionsPolicy");
});
const click = async (name: RegExp) =>
  act(async () => fireEvent.click(screen.getByRole("button", { name })));

it("starts no authentication on entry and creates only from the key-plus box without reading or storing IDs", async () => {
  const f = fixture();
  const store = vi.spyOn(Storage.prototype, "setItem");
  const view = render(<stage.Component {...f.p} />);
  expect(view.container.querySelectorAll(".problem-gift button")).toHaveLength(
    3,
  );
  expect(f.create).not.toHaveBeenCalled();
  expect(f.get).not.toHaveBeenCalled();
  await click(/^Key with plus:/);
  expect(f.p.boxes.B01?.solve).toHaveBeenCalledOnce();
  expect(f.create.mock.calls[0]?.[0]?.publicKey).toMatchObject({
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    attestation: "none",
  });
  expect(f.create.mock.calls[0]?.[0]?.signal?.aborted).toBe(true);
  expect(store).not.toHaveBeenCalled();
  await click(/^Key with plus:/);
  expect(f.create).toHaveBeenCalledOnce();
});

it("focuses the autofill field and requires an actual conditional PublicKeyCredential without a create-ID dependency", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  const input = screen.getByRole("textbox", { name: "Passkey account" });
  fireEvent.change(input, { target: { value: "busycube" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  await click(/^Open padlock:/);
  expect(document.activeElement).toBe(input);
  expect(f.get.mock.calls[0]?.[0]).toMatchObject({
    mediation: "conditional",
    publicKey: { allowCredentials: [], userVerification: "preferred" },
  });
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(f.p.boxes.B01?.solve).not.toHaveBeenCalled();
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
});

it("does not replace an unsupported conditional flow or a non-public-key return with success", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  PublicCredential.isConditionalMediationAvailable.mockResolvedValueOnce(false);
  await click(/^Open padlock:/);
  expect(f.get).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("Unavailable");
  f.get.mockResolvedValueOnce({ type: "password" } as Credential);
  await click(/^Open padlock:/);
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
});

it("counts NotAllowed only from the fresh valid modal refusal request and does not use a corrupted ID", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  f.get.mockResolvedValueOnce(new PublicCredential() as unknown as Credential);
  await click(/^Key with slash:/);
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
  f.get.mockRejectedValueOnce(
    new DOMException("Not allowed", "NotAllowedError"),
  );
  await click(/^Key with slash:/);
  expect(f.get.mock.calls[1]?.[0]).toMatchObject({
    mediation: "required",
    publicKey: {
      rpId: location.hostname,
      allowCredentials: [],
      userVerification: "required",
    },
  });
  expect(f.p.boxes.B04?.solve).toHaveBeenCalledOnce();
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toBe("Denied");
});

it.each([
  "InvalidStateError",
  "NotSupportedError",
  "SecurityError",
  "TypeError",
  "AbortError",
])("does not award refusal for %s", async (name) => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  f.get.mockRejectedValueOnce(
    name === "TypeError"
      ? new TypeError("Bad request")
      : new DOMException("Fixture", name),
  );
  await click(/^Key with slash:/);
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
});

it("never starts a request from disallowed policy or a missing gesture", async () => {
  const f = fixture();
  render(<stage.Component {...f.p} />);
  Object.defineProperty(document, "permissionsPolicy", {
    configurable: true,
    value: { allowsFeature: () => false },
  });
  await click(/^Key with slash:/);
  expect(f.get).not.toHaveBeenCalled();
  Reflect.deleteProperty(document, "permissionsPolicy");
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    value: { isActive: false },
  });
  await click(/^Key with slash:/);
  expect(f.get).not.toHaveBeenCalled();
});

it("does not turn a game timeout or subsequent NotAllowed rejection into refusal", async () => {
  vi.useFakeTimers();
  const f = fixture();
  let reject: (error: unknown) => void = () => {};
  f.get.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  render(<stage.Component {...f.p} />);
  await click(/^Key with slash:/);
  await act(async () => vi.advanceTimersByTime(110_000));
  expect(f.get.mock.calls[0]?.[0]?.signal?.aborted).toBe(true);
  expect(screen.getByRole("status").textContent).toBe("Waiting ended");
  await act(async () => reject(new DOMException("Late", "NotAllowedError")));
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("aborts on switching or departure, while platform UI visibility loss neither aborts nor awards refusal", async () => {
  const f = fixture();
  let reject: (error: unknown) => void = () => {};
  f.get.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  await click(/^Key with slash:/);
  const oldSignal = f.get.mock.calls[0]?.[0]?.signal;
  await click(/^Key with plus:/);
  expect(oldSignal?.aborted).toBe(true);
  await act(async () =>
    reject(new DOMException("Replaced", "NotAllowedError")),
  );
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
  f.get.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await click(/^Key with slash:/);
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden",
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(f.get.mock.calls[1]?.[0]?.signal?.aborted).toBe(false);
  await act(async () => reject(new DOMException("Hidden", "NotAllowedError")));
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
  Reflect.deleteProperty(document, "visibilityState");
  f.get.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  await click(/^Key with slash:/);
  view.unmount();
  expect(f.get.mock.calls[2]?.[0]?.signal?.aborted).toBe(true);
  await act(async () => reject(new DOMException("Left", "NotAllowedError")));
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
});

it("accepts a genuine conditional result after platform UI hides the page, without aborting that authentication", async () => {
  const f = fixture();
  let finish: (credential: Credential) => void = () => {};
  f.get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<stage.Component {...f.p} />);
  await click(/^Open padlock:/);
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "hidden",
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(f.get.mock.calls[0]?.[0]?.signal?.aborted).toBe(false);
  await act(async () =>
    finish(new PublicCredential() as unknown as Credential),
  );
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(f.p.boxes.B04?.solve).not.toHaveBeenCalled();
});
