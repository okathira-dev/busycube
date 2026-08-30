import BluetoothOutlined from "@mui/icons-material/BluetoothOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

type PeripheralStatus =
  | "idle"
  | "waiting"
  | "read"
  | "cancelled"
  | "unavailable";

interface BusyBluetoothCharacteristic {
  readValue(): Promise<DataView>;
}

interface BusyBluetoothService {
  getCharacteristic(name: string): Promise<BusyBluetoothCharacteristic>;
}

interface BusyBluetoothServer {
  getPrimaryService(name: string): Promise<BusyBluetoothService>;
}

interface BusyBluetoothGatt {
  connect(): Promise<BusyBluetoothServer>;
  disconnect(): void;
}

interface BusyBluetoothDevice {
  gatt?: BusyBluetoothGatt;
}

interface BusyBluetooth {
  requestDevice(options: {
    filters: readonly { services: readonly string[] }[];
  }): Promise<BusyBluetoothDevice>;
}

interface BluetoothNavigator extends Navigator {
  bluetooth: BusyBluetooth;
}

/**
 * S-280
 *
 * 目的: 近くのBluetooth LE peripheralへGATT接続し、標準Battery Serviceから実battery level byteを読む。
 * 最初の一手: Battery Serviceを公開するBLE deviceを近くでadvertiseさせ、「近くの電池を読む」からそのdeviceを選ぶ。
 * 箱ごとの解法:
 * - B01「近くの電池の箱」: 選択deviceへGATT接続し、`battery_service`の`battery_level` characteristicから1 byte以上を正常にreadできると開く。
 * 使用API: Web Bluetoothの`requestDevice()`、Bluetooth GATT connect、primary service/characteristic discovery、`readValue()`。
 * 権限・privacy: device選択権限はbutton操作時だけ要求し、読み取るのはbattery levelの先頭1 byteだけ。device名・ID・値を保存・送信しない。
 * 対応環境: secure contextでWeb Bluetoothを実装し、BLE adapterとBattery Service対応peripheralを利用できるbrowser/OS。
 */
function S280Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<PeripheralStatus>("idle");
  const [battery, setBattery] = useState<number | null>(null);
  const disconnectRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const cleanup = () => disconnectRef.current();
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal]);

  const readBattery = async () => {
    disconnectRef.current();
    try {
      const bluetooth = (navigator as unknown as BluetoothNavigator).bluetooth;
      const device = await bluetooth.requestDevice({
        filters: [{ services: ["battery_service"] }],
      });
      const gatt = device.gatt;
      if (!gatt) throw new Error("GATT unavailable");
      disconnectRef.current = () => gatt.disconnect();
      if (props.signal.aborted) {
        disconnectRef.current();
        return;
      }
      setStatus("waiting");
      const server = await gatt.connect();
      if (props.signal.aborted) {
        gatt.disconnect();
        return;
      }
      const service = await server.getPrimaryService("battery_service");
      if (props.signal.aborted) {
        gatt.disconnect();
        return;
      }
      const characteristic = await service.getCharacteristic("battery_level");
      if (props.signal.aborted) {
        gatt.disconnect();
        return;
      }
      const data = await characteristic.readValue();
      if (data.byteLength < 1) throw new Error("Empty battery value");
      if (props.signal.aborted) {
        gatt.disconnect();
        return;
      }
      setBattery(data.getUint8(0));
      setStatus("read");
      problem.solve();
      gatt.disconnect();
    } catch (error) {
      disconnectRef.current();
      if (props.signal.aborted) return;
      setStatus(
        error instanceof DOMException && error.name === "NotFoundError"
          ? "cancelled"
          : "unavailable",
      );
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="battery-preview" aria-hidden="true">
        <span style={{ height: `${battery ?? 0}%` }} />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void readBattery()}
      >
        {stageText(props.locale, locale.readBattery)}
      </button>
      <p className="measurement">{battery === null ? "—" : `${battery}%`}</p>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: BluetoothOutlined,
      color: "#22d3ee",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "bluetooth" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S280Stage,
});
