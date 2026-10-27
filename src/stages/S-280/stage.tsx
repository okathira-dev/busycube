import "./styles.css";
import BatteryStdOutlined from "@mui/icons-material/BatteryStdOutlined";
import FitnessCenterOutlined from "@mui/icons-material/FitnessCenterOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ThermostatOutlined from "@mui/icons-material/ThermostatOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { type Bluetooth, observeMeasurement } from "./gatt";
import { locale } from "./locale";
import { manifest } from "./manifest";
import type { Group } from "./measurements";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const groups = ["battery", "device", "environment", "fitness"] as const;
const ids = {
  battery: manifest.box.B02,
  device: manifest.box.B03,
  environment: manifest.box.B04,
  fitness: manifest.box.B05,
};

/**
 * S-280
 *
 * 目的: 標準GATTの四分野から実データを取得し、機器選択やservice存在だけでなく形式を検証する。
 * 最初の一手: 対応するBLE機器を用意し、各箱を押してbrowser標準chooserから選ぶ。
 * 箱ごとの解法:
 * - B02「電池」: Battery Service対応機器を選ぶ。battery_levelの実read/通知が厳密に1byteかつ0〜100なら開く。
 * - B03「情報」: Device Information対応機器を選ぶ。メーカー名またはモデル番号を実read/通知で取得し、空白だけ/制御文字/不正UTF-8ではない非空文字列を得ると開く。
 * - B04「温度計」: Environmental Sensing対応機器を選ぶ。temperatureの2byte sint16が-27315以上、humidityの2byte uint16が0〜10000、pressureの4byte uint32のいずれかを実read/通知で得ると開く。little-endianで検証する。
 * - B05「ダンベル」: Heart RateまたはFitness Machine対応機器を選ぶ。Heart Rate Measurementの8/16bit値とoptional field、またはFTMS六種のdata characteristicのflag/各field長に合う実通知を一つ受信すると開く。flagだけ/欠損/RFUは不可で、停止中の0値も可。運動負荷や値の変化は求めない。
 * 使用API: Web Bluetooth requestDevice、GATT connect/service/characteristic/readValue、startNotifications/characteristicvaluechanged。
 * 権限・privacy: 箱の明示操作でchooserを開き、該当分野の標準serviceだけをoptionalServicesへ要求する。値・機器名・IDを保存/表示/送信せず、有効取得後に切断する。
 * 対応環境: secure contextのWeb Bluetooth、BLE adapterと上記標準serviceを提供する機器。HIDや保護対象serviceは要求しない。
 */
function S280Stage(props: Props) {
  const [statuses, setStatuses] = useState<Partial<Record<Group, string>>>({});
  const current = useRef<{ group: Group; controller: AbortController } | null>(
    null,
  );
  const opened = useRef(new Set<Group>());
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    const dispose = () => {
      active.current = false;
      current.current?.controller.abort();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);
  const read = async (group: Group) => {
    if (!active.current || props.signal.aborted || opened.current.has(group))
      return;
    if (current.current?.group === group) return;
    const previousGroup = current.current?.group;
    current.current?.controller.abort();
    if (previousGroup)
      setStatuses((previous) => ({
        ...previous,
        [previousGroup]: "cancelled",
      }));
    const controller = new AbortController();
    current.current = { group, controller };
    const update = (status: string) => {
      if (active.current && !controller.signal.aborted && !props.signal.aborted)
        setStatuses((previous) => ({ ...previous, [group]: status }));
    };
    // The browser API is still absent from lib.dom.
    const bluetooth = Reflect.get(navigator, "bluetooth") as
      | Bluetooth
      | undefined;
    if (!bluetooth || typeof bluetooth.requestDevice !== "function") {
      update("unavailable");
      current.current = null;
      return;
    }
    update("waiting");
    try {
      await observeMeasurement(bluetooth, group, controller.signal);
      if (
        !controller.signal.aborted &&
        active.current &&
        !props.signal.aborted
      ) {
        opened.current.add(group);
        props.boxes[ids[group]].solve();
        update("read");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      update(
        error instanceof DOMException
          ? error.name === "AbortError"
            ? "cancelled"
            : error.name === "NotAllowedError" || error.name === "SecurityError"
              ? "denied"
              : error.name === "NotSupportedError"
                ? "unavailable"
                : error.name === "TimeoutError"
                  ? "timeout"
                  : error.name === "DataError"
                    ? "invalid"
                    : "error"
          : "error",
      );
    } finally {
      if (current.current?.controller === controller) current.current = null;
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <div className="s280-boxes">
        {groups.map((group) => (
          <div className="s280-problem" key={group}>
            <StageProblemGiftBox
              box={props.boxes[ids[group]]}
              locale={props.locale}
              onClick={() => void read(group)}
            />
            <p className="interaction-status" role="status">
              {statuses[group] === "timeout"
                ? stageText(props.locale, locale.timeout)
                : statusText(props.locale, statuses[group] ?? "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: BatteryStdOutlined,
      color: "#34d399",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: InfoOutlined,
      color: "#60a5fa",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: ThermostatOutlined,
      color: "#fbbf24",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: FitnessCenterOutlined,
      color: "#f472b6",
      label: locale.B05,
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
