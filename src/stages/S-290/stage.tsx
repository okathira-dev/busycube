import SettingsInputComponentOutlined from "@mui/icons-material/SettingsInputComponentOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
export interface HidReport {
  isTrusted: boolean;
  data: DataView;
}
export interface HidDevice {
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  addEventListener(
    type: "inputreport",
    listener: (event: HidReport) => void,
  ): void;
  removeEventListener(
    type: "inputreport",
    listener: (event: HidReport) => void,
  ): void;
}
export interface Hid {
  requestDevice(options: { filters: object[] }): Promise<HidDevice[]>;
  addEventListener(
    type: "disconnect",
    listener: (event: { device: HidDevice }) => void,
  ): void;
  removeEventListener(
    type: "disconnect",
    listener: (event: { device: HidDevice }) => void,
  ): void;
}

/**
 * S-290
 *
 * 目的: WebHIDで選択して開いた機器から、空でない実inputreportを一件受け取る。
 * 最初の一手: 機器接続の箱を押し、標準chooserでbrowserが公開するHID機器を選ぶ。
 * 箱ごとの解法:
 * - B01「機器接続」: 選んだ機器をopenし、その機器のtrusted inputreportでDataView.byteLengthが1以上になると開く。定期送信の同じ値でもよく、変化や特定buttonは要求しない。機器選択/openだけや通常のkeyboard eventでは開かない。
 * 使用API: navigator.hid.requestDevice({filters: []})、HIDDevice.open/inputreport/close、HID.disconnect。
 * 権限・privacy: 明示操作でchooserを開き、レポートは非空だけを検査する。内容/機器情報を保存・表示・送信しない。取得後にlistenerと接続を解除する。
 * 対応環境: secure contextのWebHIDと、browserがアクセスを許すHID機器。保護されたkeyboard/mouseやblocklistの制限は迂回しない。
 */
function S290Stage(props: Props) {
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
    const hid = Reflect.get(navigator, "hid") as Hid | undefined;
    if (!hid || typeof hid.requestDevice !== "function") {
      setStatus("unavailable");
      return;
    }
    const controller = new AbortController();
    current.current?.abort();
    current.current = controller;
    busy.current = true;
    const alive = () =>
      active.current &&
      !props.signal.aborted &&
      !controller.signal.aborted &&
      current.current === controller;
    let dispose = () => {};
    try {
      const [device] = await hid.requestDevice({ filters: [] });
      if (!alive()) return;
      if (!device) {
        setStatus("cancelled");
        return;
      }
      let disposed = false;
      let confirmed = false;
      let observed = false;
      let closePending: Promise<void> | undefined;
      const close = () => {
        if (!device.opened) return;
        if (!closePending)
          closePending = device
            .close()
            .catch(() => {})
            .finally(() => {
              closePending = undefined;
            });
      };
      const finish = () => {
        if (!alive() || disposed || !confirmed || !observed) return;
        solved.current = true;
        dispose();
        setStatus("read");
        problem.solve();
      };
      const onReport = (event: HidReport) => {
        if (
          !alive() ||
          disposed ||
          !device.opened ||
          !event.isTrusted ||
          !(event.data instanceof DataView) ||
          event.data.byteLength === 0
        )
          return;
        observed = true;
        finish();
      };
      const disconnected = (event: { device: HidDevice }) => {
        if (event.device !== device) return;
        dispose();
        if (alive()) setStatus("closed");
      };
      dispose = () => {
        disposed = true;
        device.removeEventListener("inputreport", onReport);
        hid.removeEventListener("disconnect", disconnected);
        close();
      };
      controller.signal.addEventListener("abort", dispose, { once: true });
      device.addEventListener("inputreport", onReport);
      hid.addEventListener("disconnect", disconnected);
      await device.open();
      if (!alive() || disposed) {
        close();
        return;
      }
      if (!device.opened) throw new Error("HID open not observed");
      confirmed = true;
      setStatus("waiting");
      finish();
    } catch (error) {
      dispose();
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
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SettingsInputComponentOutlined,
      color: "#60a5fa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "hid" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S290Stage,
});
