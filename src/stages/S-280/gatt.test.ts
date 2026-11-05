import {
  type Bluetooth,
  type Characteristic,
  type Device,
  type Gatt,
  observeMeasurement,
} from "./gatt";

const bytes = (...values: number[]) =>
  new DataView(Uint8Array.from(values).buffer);
function characteristic(value = bytes(), notify = false) {
  const listeners = new Set<(event: Pick<Event, "isTrusted">) => void>();
  const result: Characteristic = {
    value,
    properties: { read: !notify, notify, indicate: false },
    readValue: vi.fn(async () => value),
    startNotifications: vi.fn(async () => {}),
    stopNotifications: vi.fn(async () => {}),
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
  };
  return {
    result,
    listeners,
    emit(value: DataView, trusted = true) {
      // Controlled transport fixture, not a native Bluetooth event.
      result.value = value;
      for (const listener of listeners) listener({ isTrusted: trusted });
    },
  };
}
function peripheral(entries: [number, number, Characteristic][]) {
  const events = new EventTarget();
  const gatt: Gatt = {
    connected: false,
    connect: vi.fn(async () => {
      gatt.connected = true;
      return gatt;
    }),
    disconnect: vi.fn(() => {
      gatt.connected = false;
    }),
    getPrimaryService: vi.fn(async (service) => {
      if (!entries.some((entry) => entry[0] === service))
        throw new DOMException("Missing service", "NotFoundError");
      return {
        getCharacteristic: vi.fn(async (id) => {
          const match = entries.find(
            (entry) => entry[0] === service && entry[1] === id,
          );
          if (!match)
            throw new DOMException("Missing characteristic", "NotFoundError");
          return match[2];
        }),
      };
    }),
  };
  const device: Device = {
    gatt,
    addEventListener: (type, listener) =>
      events.addEventListener(type, listener),
    removeEventListener: (type, listener) =>
      events.removeEventListener(type, listener),
  };
  const bluetooth: Bluetooth = { requestDevice: vi.fn(async () => device) };
  return { gatt, device, bluetooth, events };
}
afterEach(() => {
  vi.useRealTimers();
});
it.each(["SecurityError", "NotReadableError"])(
  "tries an alternative field after %s without hiding a remaining failure",
  async (name) => {
    const unavailable = characteristic(bytes(65));
    vi.mocked(unavailable.result.readValue).mockRejectedValue(
      new DOMException("fixture", name),
    );
    const model = characteristic(bytes(77));
    const p = peripheral([
      [0x180a, 0x2a29, unavailable.result],
      [0x180a, 0x2a24, model.result],
    ]);
    await observeMeasurement(
      p.bluetooth,
      "device",
      new AbortController().signal,
    );
    expect(model.result.readValue).toHaveBeenCalledOnce();
    const failed = peripheral([[0x180a, 0x2a29, unavailable.result]]);
    await expect(
      observeMeasurement(
        failed.bluetooth,
        "device",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ name });
  },
);
it.each([
  "SecurityError",
  "NotAllowedError",
  "NotSupportedError",
  "NetworkError",
])(
  "retains %s from notification setup instead of treating every failure as unsupported",
  async (name) => {
    const item = characteristic(bytes(), true);
    vi.mocked(item.result.startNotifications).mockRejectedValue(
      new DOMException("fixture", name),
    );
    const p = peripheral([[0x180d, 0x2a37, item.result]]);
    await expect(
      observeMeasurement(p.bluetooth, "fitness", new AbortController().signal),
    ).rejects.toMatchObject({ name });
    expect(item.listeners.size).toBe(0);
    expect(p.gatt.connected).toBe(false);
  },
);
it("reads a valid zero battery, requests only its optional service and immediately disconnects", async () => {
  const item = characteristic(bytes(0));
  const p = peripheral([[0x180f, 0x2a19, item.result]]);
  await observeMeasurement(
    p.bluetooth,
    "battery",
    new AbortController().signal,
  );
  expect(p.bluetooth.requestDevice).toHaveBeenCalledWith({
    acceptAllDevices: true,
    optionalServices: [0x180f],
  });
  expect(p.gatt.disconnect).toHaveBeenCalledOnce();
  expect(p.gatt.connected).toBe(false);
  expect(item.result.startNotifications).not.toHaveBeenCalled();
});
it("rejects an invalid battery and falls back between optional device/environment fields", async () => {
  const invalid = peripheral([
    [0x180f, 0x2a19, characteristic(bytes(101)).result],
  ]);
  await expect(
    observeMeasurement(
      invalid.bluetooth,
      "battery",
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ name: "DataError" });
  expect(invalid.gatt.connected).toBe(false);
  for (const [group, entries] of [
    ["device", [[0x180a, 0x2a24, characteristic(bytes(77)).result]]],
    [
      "environment",
      [
        [0x181a, 0x2a6e, characteristic(bytes(0, 128)).result],
        [0x181a, 0x2a6f, characteristic(bytes(0, 0)).result],
      ],
    ],
  ] as const) {
    const p = peripheral(entries.map((entry) => [...entry]));
    await observeMeasurement(p.bluetooth, group, new AbortController().signal);
    expect(p.gatt.connected).toBe(false);
  }
});
it("requires a new trusted complete heart-rate notification, not cached bytes or subscription alone", async () => {
  const item = characteristic(bytes(0, 70), true);
  const p = peripheral([[0x180d, 0x2a37, item.result]]);
  const done = vi.fn();
  const result = observeMeasurement(
    p.bluetooth,
    "fitness",
    new AbortController().signal,
  ).then(done);
  await vi.waitFor(() =>
    expect(item.result.startNotifications).toHaveBeenCalledOnce(),
  );
  expect(done).not.toHaveBeenCalled();
  item.emit(bytes(0, 70), false);
  item.emit(bytes(1, 70));
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  item.emit(bytes(0, 0));
  await result;
  expect(item.result.readValue).not.toHaveBeenCalled();
  expect(item.listeners.size).toBe(0);
  expect(item.result.stopNotifications).toHaveBeenCalled();
  expect(p.gatt.connected).toBe(false);
});
it("accepts Fitness Machine without Heart Rate and waits for subscription completion after an early notification", async () => {
  const item = characteristic(bytes(), true);
  let enable: (() => void) | undefined;
  vi.mocked(item.result.startNotifications).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        enable = resolve;
      }),
  );
  const p = peripheral([[0x1826, 0x2ad2, item.result]]);
  const done = vi.fn();
  const result = observeMeasurement(
    p.bluetooth,
    "fitness",
    new AbortController().signal,
  ).then(done);
  await vi.waitFor(() =>
    expect(item.result.startNotifications).toHaveBeenCalledOnce(),
  );
  item.emit(bytes(1, 0)); // flags only
  item.emit(bytes(0, 0, 0, 0)); // real zero-speed packet in the controlled fixture
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  enable?.();
  await result;
  expect(done).toHaveBeenCalledOnce();
  expect(item.listeners.size).toBe(0);
});
it("serializes notification setup and permits a later characteristic to supply the measurement", async () => {
  const treadmill = characteristic(bytes(), true);
  const rower = characteristic(bytes(), true);
  let enable: (() => void) | undefined;
  vi.mocked(treadmill.result.startNotifications).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        enable = resolve;
      }),
  );
  const p = peripheral([
    [0x1826, 0x2acd, treadmill.result],
    [0x1826, 0x2ad1, rower.result],
  ]);
  const result = observeMeasurement(
    p.bluetooth,
    "fitness",
    new AbortController().signal,
  );
  await vi.waitFor(() =>
    expect(treadmill.result.startNotifications).toHaveBeenCalledOnce(),
  );
  expect(rower.result.startNotifications).not.toHaveBeenCalled();
  enable?.();
  await vi.waitFor(() =>
    expect(rower.result.startNotifications).toHaveBeenCalledOnce(),
  );
  rower.emit(bytes(0, 0, 0, 0, 0));
  await result;
  expect(treadmill.listeners.size + rower.listeners.size).toBe(0);
  expect(p.gatt.connected).toBe(false);
});
it("a timeout is failure and removes every notification listener and connection", async () => {
  vi.useFakeTimers();
  const item = characteristic(bytes(), true);
  const p = peripheral([[0x180d, 0x2a37, item.result]]);
  const result = observeMeasurement(
    p.bluetooth,
    "fitness",
    new AbortController().signal,
  );
  const assertion = expect(result).rejects.toMatchObject({
    name: "TimeoutError",
  });
  await vi.advanceTimersByTimeAsync(30_001);
  await assertion;
  expect(item.listeners.size).toBe(0);
  expect(item.result.stopNotifications).toHaveBeenCalled();
  expect(p.gatt.connected).toBe(false);
});
it("rejects peer disconnection and does not retain listeners", async () => {
  const item = characteristic(bytes(), true);
  const p = peripheral([[0x180d, 0x2a37, item.result]]);
  const result = observeMeasurement(
    p.bluetooth,
    "fitness",
    new AbortController().signal,
  );
  const assertion = expect(result).rejects.toMatchObject({
    name: "NetworkError",
  });
  await vi.waitFor(() =>
    expect(item.result.startNotifications).toHaveBeenCalledOnce(),
  );
  p.gatt.connected = false;
  p.events.dispatchEvent(new Event("gattserverdisconnected"));
  await assertion;
  expect(item.listeners.size).toBe(0);
});
it("stops a device selected after departure and a connect which completes after abort", async () => {
  const p = peripheral([[0x180f, 0x2a19, characteristic(bytes(50)).result]]);
  const controller = new AbortController();
  let select: ((device: Device) => void) | undefined;
  vi.mocked(p.bluetooth.requestDevice).mockImplementation(
    () =>
      new Promise((resolve) => {
        select = resolve;
      }),
  );
  const result = observeMeasurement(p.bluetooth, "battery", controller.signal);
  const assertion = expect(result).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  select?.(p.device);
  await assertion;
  expect(p.gatt.connect).not.toHaveBeenCalled();
  expect(p.gatt.disconnect).toHaveBeenCalled();
  const other = peripheral([
    [0x180f, 0x2a19, characteristic(bytes(50)).result],
  ]);
  let connect: ((gatt: Gatt) => void) | undefined;
  vi.mocked(other.gatt.connect).mockImplementation(
    () =>
      new Promise((resolve) => {
        connect = resolve;
      }),
  );
  const next = new AbortController();
  const pending = observeMeasurement(other.bluetooth, "battery", next.signal);
  const rejected = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  await vi.waitFor(() => expect(other.gatt.connect).toHaveBeenCalledOnce());
  next.abort();
  await rejected;
  other.gatt.connected = true;
  connect?.(other.gatt);
  await Promise.resolve();
  expect(other.gatt.connected).toBe(false);
});
it("a dismissed chooser or missing services do not produce a measurement", async () => {
  const p = peripheral([]);
  await expect(
    observeMeasurement(p.bluetooth, "fitness", new AbortController().signal),
  ).rejects.toMatchObject({ name: "NotSupportedError" });
  expect(p.gatt.connected).toBe(false);
  vi.mocked(p.bluetooth.requestDevice).mockRejectedValue(
    new DOMException("cancel", "NotFoundError"),
  );
  await expect(
    observeMeasurement(p.bluetooth, "battery", new AbortController().signal),
  ).rejects.toMatchObject({ name: "AbortError" });
});
