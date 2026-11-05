// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { type Hid, type HidDevice, type HidReport, stage } from "./stage";

const previous = Object.getOwnPropertyDescriptor(navigator, "hid");
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
  const listeners = new Set<(event: HidReport) => void>();
  const disconnects = new Set<(event: { device: HidDevice }) => void>();
  const device: HidDevice = {
    opened: false,
    open: vi.fn(async () => {
      device.opened = true;
    }),
    close: vi.fn(async () => {
      device.opened = false;
    }),
    addEventListener: (_type, fn) => {
      listeners.add(fn);
    },
    removeEventListener: (_type, fn) => {
      listeners.delete(fn);
    },
  };
  const hid: Hid = {
    requestDevice: vi.fn(async () => [device]),
    addEventListener: (_type, fn) => {
      disconnects.add(fn);
    },
    removeEventListener: (_type, fn) => {
      disconnects.delete(fn);
    },
  };
  Object.defineProperty(navigator, "hid", { configurable: true, value: hid });
  return {
    hid,
    device,
    listeners,
    disconnects,
    emit(bytes: number[], isTrusted: boolean) {
      // Controlled native-report fixture; these are not actual HID events.
      const data = new DataView(Uint8Array.from(bytes).buffer);
      for (const listener of listeners) listener({ data, isTrusted });
    },
  };
}
afterEach(() => {
  cleanup();
  if (previous) Object.defineProperty(navigator, "hid", previous);
  else Reflect.deleteProperty(navigator, "hid");
});
it("starts from one box with empty filters and accepts any nonempty native report only after open", async () => {
  const f = fixture();
  const p = props();
  render(<stage.Component {...p} />);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^Device connection:/ }),
    );
  });
  expect(f.hid.requestDevice).toHaveBeenCalledWith({ filters: [] });
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
  act(() => {
    f.emit([], true);
    f.emit([0], false);
  });
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
  await act(async () => {
    f.emit([0], true);
    f.emit([0], true);
  });
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).toHaveBeenCalledOnce();
  expect(f.listeners.size + f.disconnects.size).toBe(0);
  expect(f.device.close).toHaveBeenCalledOnce();
  expect(f.device.opened).toBe(false);
});
it("keeps an early periodic report until open resolves", async () => {
  const f = fixture();
  let open: (() => void) | undefined;
  vi.mocked(f.device.open).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        open = resolve;
      }),
  );
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^Device connection:/ }),
    );
  });
  act(() => {
    f.device.opened = true;
    f.emit([7], true);
  });
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
  await act(async () => {
    open?.();
  });
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).toHaveBeenCalledOnce();
});
it("does not accept an early report if open ultimately fails", async () => {
  const f = fixture();
  let fail: ((error: unknown) => void) | undefined;
  vi.mocked(f.device.open).mockImplementation(
    () =>
      new Promise<void>((_resolve, reject) => {
        fail = reject;
      }),
  );
  const p = props();
  render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^Device connection:/ }),
    );
  });
  act(() => {
    f.device.opened = true;
    f.emit([7], true);
  });
  await act(async () => {
    fail?.(new DOMException("Denied", "SecurityError"));
  });
  expect(screen.getByRole("status").textContent).toBe("Denied");
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
  expect(f.device.opened).toBe(false);
  expect(f.listeners.size + f.disconnects.size).toBe(0);
});
it("closes a late open after departure and does not open a device chosen after departure", async () => {
  const f = fixture();
  let open: (() => void) | undefined;
  vi.mocked(f.device.open).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        open = resolve;
      }),
  );
  const p = props();
  const view = render(<stage.Component {...p} />);
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /^Device connection:/ }),
    );
  });
  view.unmount();
  await act(async () => {
    f.device.opened = true;
    open?.();
  });
  expect(f.device.opened).toBe(false);
  expect(f.listeners.size + f.disconnects.size).toBe(0);
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
  let select: ((devices: HidDevice[]) => void) | undefined;
  vi.mocked(f.hid.requestDevice).mockImplementation(
    () =>
      new Promise((resolve) => {
        select = resolve;
      }),
  );
  const next = render(<stage.Component {...props()} />);
  fireEvent.click(screen.getByRole("button", { name: /^Device connection:/ }));
  next.unmount();
  await act(async () => {
    select?.([f.device]);
  });
  expect(f.device.open).toHaveBeenCalledOnce();
});
it("handles chooser cancellation, denied open, and device disconnection without success", async () => {
  const f = fixture();
  vi.mocked(f.hid.requestDevice).mockResolvedValueOnce([]);
  const p = props();
  render(<stage.Component {...p} />);
  const button = screen.getByRole("button", { name: /^Device connection:/ });
  await act(async () => {
    fireEvent.click(button);
  });
  expect(screen.getByRole("status").textContent).toBe("Cancelled");
  vi.mocked(f.device.open).mockRejectedValueOnce(
    new DOMException("Denied", "SecurityError"),
  );
  await act(async () => {
    fireEvent.click(button);
  });
  expect(screen.getByRole("status").textContent).toBe("Denied");
  await act(async () => {
    fireEvent.click(button);
  });
  await act(async () => {
    f.device.opened = false;
    for (const listener of f.disconnects) listener({ device: f.device });
  });
  expect(screen.getByRole("status").textContent).toBe("Closed");
  for (const problem of Object.values(p.boxes))
    expect(problem.solve).not.toHaveBeenCalled();
  expect(f.listeners.size + f.disconnects.size).toBe(0);
});
