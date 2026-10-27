// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import type { ContactInfoLike } from "./functions";
import { type ContactsManagerLike, stage } from "./stage";

const previous = Object.getOwnPropertyDescriptor(navigator, "contacts");
function fixture() {
  const select = vi.fn<ContactsManagerLike["select"]>(async () => []);
  Object.defineProperty(navigator, "contacts", {
    configurable: true,
    value: { select },
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
  return { p, select, controller };
}
const full = (): ContactInfoLike => ({
  name: ["Busycube Courier", "private returned extra"],
  email: ["courier@busycube.invalid"],
  tel: ["+81 3-0000-0000"],
  address: [
    {
      addressLine: ["1-1-1 Busycube"],
      city: "Tokyo",
      postalCode: "100-0001",
      country: "Japan",
    },
  ],
  icon: [new Blob(["unmatched picture"])],
});
afterEach(() => {
  cleanup();
  if (previous) Object.defineProperty(navigator, "contacts", previous);
  else Reflect.deleteProperty(navigator, "contacts");
});

it("opens the same five-field native picker from either box and never displays returned content", async () => {
  const f = fixture();
  f.select.mockResolvedValueOnce([full()]).mockResolvedValueOnce([{}]);
  render(<stage.Component {...f.p} />);
  expect(screen.getAllByRole("button")).toHaveLength(2);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Contact card:/ }));
  });
  expect(f.p.boxes.B01?.solve).toHaveBeenCalledOnce();
  expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
  expect(document.body.textContent).not.toContain("private returned extra");
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^Slashed contact card:/ }),
    );
  });
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
  expect(f.select).toHaveBeenNthCalledWith(
    1,
    ["name", "email", "tel", "address", "icon"],
    { multiple: false },
  );
  expect(f.select.mock.calls[1]).toEqual(f.select.mock.calls[0]);
});

it("distinguishes cancellation, zero contacts, partial sharing and multiple contacts from a selected empty contact", async () => {
  const f = fixture();
  f.select
    .mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"))
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ name: ["private returned extra"] }])
    .mockResolvedValueOnce([{}, {}])
    .mockResolvedValueOnce([{}]);
  render(<stage.Component {...f.p} />);
  const button = screen.getByRole("button", { name: /^Slashed contact card:/ });
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      fireEvent.click(button);
    });
    expect(f.p.boxes.B02?.solve).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("private returned extra");
  }
  await act(async () => {
    fireEvent.click(button);
  });
  expect(f.p.boxes.B02?.solve).toHaveBeenCalledOnce();
});

it("prevents overlapping pickers and ignores late results after leaving without reading them", async () => {
  const f = fixture();
  let resolve: ((value: ContactInfoLike[]) => void) | undefined;
  f.select.mockImplementation(
    () =>
      new Promise((complete) => {
        resolve = complete;
      }),
  );
  const view = render(<stage.Component {...f.p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^Contact card:/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Slashed contact card:/ }),
    );
  });
  expect(f.select).toHaveBeenCalledOnce();
  view.unmount();
  const read = vi.fn(() => {
    throw new Error("Do not inspect a late result");
  });
  const late = new Proxy([] as ContactInfoLike[], {
    get: (_target, key) => (key === "then" ? undefined : read()),
  });
  await act(async () => {
    resolve?.(late);
  });
  expect(f.p.boxes.B01?.solve).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});

it("keeps denied, unsupported and other picker failures unachieved", async () => {
  const f = fixture();
  f.select
    .mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"))
    .mockRejectedValueOnce(new DOMException("Unsupported", "NotSupportedError"))
    .mockRejectedValueOnce(new Error("Failed"));
  render(<stage.Component {...f.p} />);
  for (const status of ["Denied", "Unavailable", "Error"]) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Contact card:/ }));
    });
    expect(screen.getByRole("status").textContent).toBe(status);
  }
  expect(f.p.boxes.B01?.solve).not.toHaveBeenCalled();
});
