// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage, type Usb, type UsbDevice } from "./stage";

const previous = Object.getOwnPropertyDescriptor(navigator, "usb");
function props(): StageComponentProps {
  return {
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
}
function fixture() {
  const forbidden = vi.fn(() => {
    throw new Error("No configuration, interface or transfer operations");
  });
  const device: UsbDevice = {
    opened: false,
    open: vi.fn(async () => {
      device.opened = true;
    }),
    close: vi.fn(async () => {
      device.opened = false;
    }),
  };
  Object.assign(device, {
    selectConfiguration: forbidden,
    claimInterface: forbidden,
    transferIn: forbidden,
    transferOut: forbidden,
  });
  Object.defineProperty(device, "configuration", { get: forbidden });
  const usb: Usb = { requestDevice: vi.fn(async () => device) };
  Object.defineProperty(navigator, "usb", { configurable: true, value: usb });
  return { device, usb, forbidden };
}
afterEach(() => {
  cleanup();
  if (previous) Object.defineProperty(navigator, "usb", previous);
  else Reflect.deleteProperty(navigator, "usb");
});
it("opens from the USB box with empty filters and immediately closes without any transfer/discovery", async () => {
  const f = fixture();
  const p = props();
  render(<stage.Component {...p} />);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^USB:/ }));
  });
  expect(f.usb.requestDevice).toHaveBeenCalledWith({ filters: [] });
  expect(f.device.open).toHaveBeenCalledOnce();
  expect(f.device.close).toHaveBeenCalledOnce();
  expect(f.device.opened).toBe(false);
  expect(f.forbidden).not.toHaveBeenCalled();
  for (const box of Object.values(p.boxes))
    expect(box.solve).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toBe("Opened");
});
it("does not treat device choice or an open promise without actual opened state as success", async () => {
  const f = fixture();
  let complete: (() => void) | undefined;
  vi.mocked(f.device.open).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const p = props();
  render(<stage.Component {...p} />);
  const button = screen.getByRole("button", { name: /^USB:/ });
  await act(async () => {
    fireEvent.click(button);
    fireEvent.click(button);
  });
  expect(f.usb.requestDevice).toHaveBeenCalledOnce();
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
  await act(async () => {
    complete?.();
  });
  expect(screen.getByRole("status").textContent).toBe("Error");
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
});
it("closes an open completing after departure and never opens a late chooser selection", async () => {
  const f = fixture();
  let complete: (() => void) | undefined;
  vi.mocked(f.device.open).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^USB:/ }));
  });
  view.unmount();
  await act(async () => {
    f.device.opened = true;
    complete?.();
  });
  expect(f.device.close).toHaveBeenCalledOnce();
  expect(f.device.opened).toBe(false);
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
  let choose: ((device: UsbDevice) => void) | undefined;
  vi.mocked(f.usb.requestDevice).mockImplementation(
    () =>
      new Promise((resolve) => {
        choose = resolve;
      }),
  );
  const next = render(<stage.Component {...props()} />);
  fireEvent.click(screen.getByRole("button", { name: /^USB:/ }));
  next.unmount();
  await act(async () => {
    choose?.(f.device);
  });
  expect(f.device.open).toHaveBeenCalledOnce();
});
it.each([
  ["NotFoundError", "Cancelled"],
  ["SecurityError", "Denied"],
  ["NotSupportedError", "Unavailable"],
])("does not solve after %s", async (name, status) => {
  const f = fixture();
  vi.mocked(f.device.open).mockRejectedValue(new DOMException("fixture", name));
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /^USB:/ }));
  });
  expect(screen.getByRole("status").textContent).toBe(status);
  for (const box of Object.values(p.boxes))
    expect(box.solve).not.toHaveBeenCalled();
  expect(f.forbidden).not.toHaveBeenCalled();
});
