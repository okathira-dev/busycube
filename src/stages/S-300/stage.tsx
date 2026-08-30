import UsbOutlined from "@mui/icons-material/UsbOutlined";
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

interface BusyUsbEndpoint {
  direction: "in" | "out";
  endpointNumber: number;
  type: "bulk" | "interrupt" | "isochronous";
}

interface BusyUsbAlternate {
  endpoints: readonly BusyUsbEndpoint[];
}

interface BusyUsbInterface {
  interfaceNumber: number;
  alternate: BusyUsbAlternate;
}

interface BusyUsbConfiguration {
  interfaces: readonly BusyUsbInterface[];
}

interface BusyUsbDevice {
  configuration: BusyUsbConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferIn(
    endpointNumber: number,
    length: number,
  ): Promise<{ data?: DataView }>;
}

interface BusyUsb {
  requestDevice(options: {
    filters: readonly object[];
  }): Promise<BusyUsbDevice>;
}

interface UsbNavigator extends Navigator {
  usb: BusyUsb;
}

/**
 * S-300
 *
 * 目的: 利用者が選んだUSB deviceのIN endpointを発見・claimし、実際のbulk/interrupt転送からdataを受信する。
 * 最初の一手: 「USBから受け取る」を押してdata送信可能なUSB deviceを選び、必要ならdevice側を操作してIN dataを送る。
 * 箱ごとの解法:
 * - B01「USB転送の箱」: deviceをopenしconfiguration 1を選択、最初のbulkまたはinterrupt IN endpointのinterfaceをclaimし、64 byteの`transferIn()`結果が1 byte以上なら開く。
 * 使用API: WebUSBの`requestDevice()`、USBDevice open/configuration/interface claim、endpoint情報、`transferIn()`、close。
 * 権限・privacy: device accessはbutton操作とbrowser pickerで要求し、受信dataはbyte長だけを判定する。payload・device descriptorを保存・表示・送信しない。
 * 対応環境: secure contextでWebUSBを実装し、browser access可能なbulk/interrupt IN endpoint付きUSB deviceを接続できる環境。
 */
function S300Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<PeripheralStatus>("idle");
  const cleanupRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const cleanup = () => cleanupRef.current();
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal]);

  const receive = async () => {
    cleanupRef.current();
    try {
      const usb = (navigator as unknown as UsbNavigator).usb;
      const device = await usb.requestDevice({ filters: [] });
      if (props.signal.aborted) return;
      await device.open();
      cleanupRef.current = () => void device.close().catch(() => undefined);
      if (props.signal.aborted) {
        cleanupRef.current();
        return;
      }
      if (!device.configuration) await device.selectConfiguration(1);
      if (props.signal.aborted) {
        cleanupRef.current();
        return;
      }
      const selected = device.configuration?.interfaces
        .flatMap((usbInterface) =>
          usbInterface.alternate.endpoints.map((endpoint) => ({
            endpoint,
            interfaceNumber: usbInterface.interfaceNumber,
          })),
        )
        .find(
          ({ endpoint }) =>
            endpoint.direction === "in" &&
            (endpoint.type === "interrupt" || endpoint.type === "bulk"),
        );
      if (!selected) throw new Error("No IN endpoint");
      await device.claimInterface(selected.interfaceNumber);
      if (props.signal.aborted) {
        cleanupRef.current();
        return;
      }
      setStatus("waiting");
      const result = await device.transferIn(
        selected.endpoint.endpointNumber,
        64,
      );
      if (!result.data?.byteLength) throw new Error("Empty USB transfer");
      if (props.signal.aborted) return;
      setStatus("read");
      problem.solve();
      cleanupRef.current();
    } catch (error) {
      // A failure can occur after open, so the catch path must also close hardware.
      cleanupRef.current();
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
      <div
        className="usb-wire"
        data-active={status === "read"}
        aria-hidden="true"
      >
        <span />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void receive()}
      >
        {stageText(props.locale, locale.receiveUsb)}
      </button>
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
      icon: UsbOutlined,
      color: "#818cf8",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "usb" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S300Stage,
});
