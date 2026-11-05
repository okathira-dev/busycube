import { type Group, measurements, validMeasurement } from "./measurements";

type ValueListener = (event: Pick<Event, "isTrusted">) => void;
export interface Characteristic {
  properties: { read: boolean; notify: boolean; indicate: boolean };
  value?: DataView;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<unknown>;
  stopNotifications(): Promise<unknown>;
  addEventListener(
    type: "characteristicvaluechanged",
    listener: ValueListener,
  ): void;
  removeEventListener(
    type: "characteristicvaluechanged",
    listener: ValueListener,
  ): void;
}
export interface Gatt {
  connected: boolean;
  connect(): Promise<Gatt>;
  disconnect(): void;
  getPrimaryService(
    uuid: number,
  ): Promise<{ getCharacteristic(uuid: number): Promise<Characteristic> }>;
}
export interface Device {
  gatt?: Gatt;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
  removeEventListener(
    type: "gattserverdisconnected",
    listener: () => void,
  ): void;
}
export interface Bluetooth {
  requestDevice(options: {
    acceptAllDevices: true;
    optionalServices: number[];
  }): Promise<Device>;
}

function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  late?: () => void,
) {
  return new Promise<T>((resolve, reject) => {
    const abort = () =>
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) {
          late?.();
          abort();
        } else resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}

function failMeasurement(
  errors: readonly unknown[],
  invalidRead: boolean,
): never {
  const primary =
    errors.find(
      (error) =>
        error instanceof DOMException &&
        (error.name === "SecurityError" || error.name === "NotAllowedError"),
    ) ??
    errors.find(
      (error) =>
        !(error instanceof DOMException && error.name === "NotSupportedError"),
    );
  if (primary !== undefined) throw primary;
  throw new DOMException(
    "No valid measurement",
    invalidRead ? "DataError" : "NotSupportedError",
  );
}

/** Chooser is called synchronously from the player's gesture; only a validated read/notification resolves. */
export async function observeMeasurement(
  bluetooth: Bluetooth,
  group: Group,
  signal: AbortSignal,
) {
  let device: Device;
  try {
    device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        ...new Set(measurements[group].map((item) => item.service)),
      ],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError")
      throw new DOMException("Chooser dismissed", "AbortError");
    throw error;
  }
  const gatt = device.gatt;
  if (!gatt) throw new DOMException("GATT unavailable", "NotSupportedError");
  if (signal.aborted) {
    gatt.disconnect();
    throw signal.reason;
  }
  const local = new AbortController();
  const abort = () => local.abort(signal.reason);
  const disconnected = () =>
    local.abort(new DOMException("Device disconnected", "NetworkError"));
  const stopGatt = () => gatt.disconnect();
  const assertConnected = () => {
    local.signal.throwIfAborted();
    if (!gatt.connected)
      throw new DOMException("Device disconnected", "NetworkError");
  };
  signal.addEventListener("abort", abort, { once: true });
  device.addEventListener("gattserverdisconnected", disconnected);
  local.signal.addEventListener("abort", stopGatt, { once: true });
  const timer = setTimeout(
    () =>
      local.abort(new DOMException("No measurement received", "TimeoutError")),
    30_000,
  );
  const subscriptions: (() => void)[] = [];
  try {
    await abortable(gatt.connect(), local.signal, stopGatt);
    assertConnected();
    const candidates: { id: number; characteristic: Characteristic }[] = [];
    let invalidRead = false;
    const errors: unknown[] = [];
    for (const item of measurements[group]) {
      let characteristic: Characteristic;
      try {
        const service = await abortable(
          gatt.getPrimaryService(item.service),
          local.signal,
        );
        assertConnected();
        characteristic = await abortable(
          service.getCharacteristic(item.characteristic),
          local.signal,
        );
        assertConnected();
      } catch (error) {
        assertConnected();
        if (error instanceof DOMException && error.name === "NotFoundError")
          continue;
        errors.push(error);
        continue;
      }
      if (!item.notificationsOnly && characteristic.properties.read) {
        try {
          const value = await abortable(
            characteristic.readValue(),
            local.signal,
          );
          assertConnected();
          if (validMeasurement(item.characteristic, value)) return;
          invalidRead = true;
        } catch (error) {
          assertConnected();
          errors.push(error);
        }
      }
      if (
        characteristic.properties.notify ||
        characteristic.properties.indicate
      )
        candidates.push({ id: item.characteristic, characteristic });
    }
    if (!candidates.length) failMeasurement(errors, invalidRead);
    const channels = candidates.map(({ id, characteristic }) => {
      let enable: () => Promise<void> = async () => {};
      const received = new Promise<void>((resolve, reject) => {
        let enabled = false;
        let observed = false;
        const finish = () => {
          if (enabled && observed) resolve();
        };
        const listener: ValueListener = (event) => {
          if (!event.isTrusted || local.signal.aborted || !gatt.connected)
            return;
          if (
            characteristic.value &&
            validMeasurement(id, characteristic.value)
          ) {
            observed = true;
            finish();
          }
        };
        const stop = () => {
          characteristic.removeEventListener(
            "characteristicvaluechanged",
            listener,
          );
          void characteristic.stopNotifications().catch(() => {});
        };
        subscriptions.push(stop);
        characteristic.addEventListener("characteristicvaluechanged", listener);
        // Register before enabling: a first native notification may arrive before the promise resolves.
        enable = async () => {
          try {
            local.signal.throwIfAborted();
            await abortable(
              characteristic.startNotifications(),
              local.signal,
              stop,
            );
            enabled = true;
            finish();
          } catch (error) {
            reject(error);
          }
        };
      });
      return { received, enable };
    });
    // GATT operations must not overlap; keep subscriptions live while enabling the next one.
    const enableAll = async () => {
      for (const channel of channels) {
        if (local.signal.aborted) break;
        await channel.enable();
      }
    };
    void enableAll();
    try {
      await abortable(
        Promise.any(channels.map((channel) => channel.received)),
        local.signal,
      );
    } catch (error) {
      local.signal.throwIfAborted();
      if (error instanceof AggregateError) {
        failMeasurement([...errors, ...error.errors], invalidRead);
      }
      throw error;
    }
    assertConnected();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    device.removeEventListener("gattserverdisconnected", disconnected);
    local.signal.removeEventListener("abort", stopGatt);
    local.abort();
    for (const stop of subscriptions) stop();
    gatt.disconnect();
  }
}
