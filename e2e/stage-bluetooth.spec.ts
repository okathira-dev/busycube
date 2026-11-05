import { expect, test } from "@playwright/test";
import type {
  Bluetooth,
  Characteristic,
  Device,
  Gatt,
} from "../src/stages/S-280/gatt";

test("controlled GATT fixtures exercise four boxes, notifications, hidden values and disconnection", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    // This whole transport is controlled. It is not a physical/native GATT observation.
    const events = new EventTarget();
    const listenerSet = new Set<(event: Pick<Event, "isTrusted">) => void>();
    let notifyStarted = 0;
    let notifyStopped = 0;
    const gatt: Gatt = {
      connected: false,
      async connect() {
        this.connected = true;
        return this;
      },
      disconnect() {
        this.connected = false;
      },
      async getPrimaryService(service) {
        return {
          async getCharacteristic(id) {
            const expected: Record<number, number[]> = {
              6159: [0x2a19],
              6154: [0x2a29],
              6170: [0x2a6f],
              6157: [0x2a37],
            };
            if (!expected[service]?.includes(id))
              throw new DOMException(
                "Missing fixture characteristic",
                "NotFoundError",
              );
            const notify = id === 0x2a37;
            const initial =
              id === 0x2a19
                ? [0]
                : id === 0x2a29
                  ? [...new TextEncoder().encode("Controlled maker")]
                  : [0, 0];
            const item: Characteristic = {
              value: new DataView(Uint8Array.from(initial).buffer),
              properties: { read: !notify, notify, indicate: false },
              async readValue() {
                return new DataView(Uint8Array.from(initial).buffer);
              },
              async startNotifications() {
                notifyStarted++;
              },
              async stopNotifications() {
                notifyStopped++;
              },
              addEventListener(_type, listener) {
                listenerSet.add(listener);
              },
              removeEventListener(_type, listener) {
                listenerSet.delete(listener);
              },
            };
            if (notify)
              Reflect.set(
                window,
                "emitGattFixture",
                (values: number[], trusted: boolean) => {
                  item.value = new DataView(Uint8Array.from(values).buffer);
                  for (const listener of listenerSet)
                    listener({ isTrusted: trusted });
                },
              );
            return item;
          },
        };
      },
    };
    const device: Device = {
      gatt,
      addEventListener: (type, fn) => events.addEventListener(type, fn),
      removeEventListener: (type, fn) => events.removeEventListener(type, fn),
    };
    const bluetooth: Bluetooth = {
      async requestDevice() {
        return device;
      },
    };
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: bluetooth,
    });
    Reflect.set(window, "gattFixtureState", () => ({
      connected: gatt.connected,
      listeners: listenerSet.size,
      notifyStarted,
      notifyStopped,
    }));
  });
  await page.goto("/?locale=en&stage=S-280");
  const boxes = page.locator(".s280-boxes .gift-box");
  await expect(boxes).toHaveCount(4);
  for (const [index, name] of [
    "Battery",
    "Information",
    "Thermometer",
  ].entries()) {
    await page.getByRole("button", { name: new RegExp(`^${name}:`) }).click();
    await expect(boxes.nth(index)).toHaveAttribute("data-box-state", "open");
    expect(
      await page.evaluate(() => {
        const state = Reflect.get(window, "gattFixtureState") as () => {
          connected: boolean;
        };
        return state().connected;
      }),
    ).toBe(false);
  }
  await expect(page.getByText("Controlled maker")).toHaveCount(0);
  await page.getByRole("button", { name: /^Dumbbell:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = Reflect.get(window, "gattFixtureState") as () => {
          notifyStarted: number;
        };
        return state().notifyStarted;
      }),
    )
    .toBe(1);
  await expect(boxes.nth(3)).not.toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    const emit = Reflect.get(window, "emitGattFixture") as (
      values: number[],
      trusted: boolean,
    ) => void;
    emit([0, 60], false);
    emit([1, 60], true);
  });
  await expect(boxes.nth(3)).not.toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    const emit = Reflect.get(window, "emitGattFixture") as (
      values: number[],
      trusted: boolean,
    ) => void;
    emit([0, 0], true);
  });
  await expect(boxes.nth(3)).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(() => {
      const state = Reflect.get(window, "gattFixtureState") as () => {
        connected: boolean;
        listeners: number;
        notifyStopped: number;
      };
      return state();
    }),
  ).toMatchObject({ connected: false, listeners: 0, notifyStopped: 1 });
  await page.screenshot({
    path: testInfo.outputPath("bluetooth-four-groups.png"),
  });
});
