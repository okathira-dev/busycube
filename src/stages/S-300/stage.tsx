import UsbOutlined from "@mui/icons-material/UsbOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
export interface UsbDevice {
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
}
export interface Usb {
  requestDevice(options: { filters: object[] }): Promise<UsbDevice>;
}

/**
 * S-300
 *
 * 目的: WebUSBの標準chooserで選んだ機器を実際にopenする。
 * 最初の一手: USBの箱を押し、browserがアクセスを許す機器をchooserで選ぶ。
 * 箱ごとの解法:
 * - B01「USB」: 選んだ機器の実USBDevice.openが成功し、openedがtrueになると開く。機器選択だけでは開かない。確認後すぐcloseし、configuration選択/interface claim/endpoint発見/任意転送は行わない。
 * 使用API: navigator.usb.requestDevice({filters: []})、USBDevice.open/opened/close。
 * 権限・privacy: 明示操作でbrowser標準chooserを開く。機器情報/descriptorを保存・表示・送信せず、データ転送を要求しない。
 * 対応環境: secure contextのWebUSBと、browserがアクセスを許可するUSB機器。browserの保護・制限を迂回しない。
 */
function S300Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState("");
  const active = useRef(false);
  const current = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const solved = useRef(false);
  useEffect(() => {
    active.current = true;
    const dispose = () => {
      active.current = false;
      current.current?.abort();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);
  const start = async () => {
    if (
      busy.current ||
      solved.current ||
      !active.current ||
      props.signal.aborted
    )
      return;
    const usb = Reflect.get(navigator, "usb") as Usb | undefined;
    if (!usb || typeof usb.requestDevice !== "function") {
      setStatus("unavailable");
      return;
    }
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    const alive = () =>
      active.current &&
      !props.signal.aborted &&
      !controller.signal.aborted &&
      current.current === controller;
    busy.current = true;
    let close = () => {};
    try {
      const device = await usb.requestDevice({ filters: [] });
      if (!alive()) return;
      let opening = true;
      let closePending: Promise<void> | undefined;
      close = () => {
        if (opening || !device.opened) return;
        if (!closePending)
          closePending = device
            .close()
            .catch(() => {})
            .finally(() => {
              closePending = undefined;
            });
      };
      controller.signal.addEventListener("abort", close, { once: true });
      setStatus("waiting");
      try {
        await device.open();
      } finally {
        opening = false;
      }
      if (!alive()) return;
      if (!device.opened) throw new Error("USB open not observed");
      close();
      solved.current = true;
      setStatus("opened");
      problem.solve();
    } catch (error) {
      if (alive())
        setStatus(
          error instanceof DOMException
            ? error.name === "NotFoundError" || error.name === "AbortError"
              ? "cancelled"
              : error.name === "SecurityError" ||
                  error.name === "NotAllowedError"
                ? "denied"
                : error.name === "NotSupportedError"
                  ? "unavailable"
                  : "error"
            : "error",
        );
    } finally {
      close();
      if (current.current === controller) busy.current = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={() => void start()}
      />
      <p className="interaction-status" role="status">
        {status === "opened"
          ? stageText(props.locale, locale.opened)
          : statusText(props.locale, status)}
      </p>
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
