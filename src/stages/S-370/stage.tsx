import "./styles.css";
import Battery2BarOutlined from "@mui/icons-material/Battery2BarOutlined";
import BatteryFullOutlined from "@mui/icons-material/BatteryFullOutlined";
import PowerOffOutlined from "@mui/icons-material/PowerOffOutlined";
import PowerOutlined from "@mui/icons-material/PowerOutlined";
import { useEffect, useState } from "react";
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

/**
 * S-370
 *
 * 目的: 現在の充電状態と残量75%の境界をBattery Status APIで観測し、対になる状態を集める。
 * 最初の一手: 入場時に開いた箱と中央の電池図を見て、充電接続や残量を変える。
 * 箱ごとの解法:
 * - B01「プラグ」: chargerを接続する。getBattery取得直後またはchange時の実chargingがtrueなら開く。入場後の切替は必須にしない。
 * - B02「斜線入りプラグ」: chargerを外す。取得直後またはchange時の実chargingがfalseなら開く。
 * - B03「満ちた電池」: 端末を充電して残量を75%以上にする。取得直後またはlevelchange時の有限なlevelが0.75〜1なら開く。
 * - B04「少ない電池」: 端末の残量を75%未満にする。同じ観測でlevelが0以上0.75未満なら開く。訪問をまたいで通常進捗へ累積できる。
 * 使用API: navigator.getBattery、BatteryManager.charging/level、chargingchange/levelchange。
 * 権限・privacy: 権限を要求せず、充電状態と丸めた残量だけを現在表示へ使い、履歴や端末情報を保存・送信しない。
 * 対応環境: Battery Status APIを公開するブラウザー・端末。
 */
function S370Stage(props: Props) {
  const plugged = props.boxes.B01;
  const unplugged = props.boxes.B02;
  const high = props.boxes.B03;
  const low = props.boxes.B04;
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let battery: BatteryManager | undefined;
    const inspect = () => {
      if (!active || props.signal.aborted || !battery) return;
      const value = battery.level;
      if (Number.isFinite(value) && value >= 0 && value <= 1) {
        setLevel(value);
        if (value >= 0.75) high.solve();
        else low.solve();
      }
      if (typeof battery.charging === "boolean") {
        setCharging(battery.charging);
        if (battery.charging) plugged.solve();
        else unplugged.solve();
      }
    };
    void navigator
      .getBattery?.()
      .then((manager) => {
        if (!active || props.signal.aborted) return;
        battery = manager;
        inspect();
        battery.addEventListener("levelchange", inspect);
        battery.addEventListener("chargingchange", inspect);
      })
      .catch(() => {
        if (active && !props.signal.aborted) setError(true);
      });
    const stop = () => {
      active = false;
      battery?.removeEventListener("levelchange", inspect);
      battery?.removeEventListener("chargingchange", inspect);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [high.solve, low.solve, plugged.solve, props.signal, unplugged.solve]);
  const Plug = charging ? PowerOutlined : PowerOffOutlined;
  return (
    <div className="puzzle puzzle--centered">
      <div className="battery-reading">
        <div className="battery-reading__body" aria-hidden="true">
          <span style={{ width: level === null ? "0%" : `${level * 100}%` }} />
        </div>
        <p className="measurement" aria-live="polite">
          {level === null ? "—" : `${Math.round(level * 100)}%`}
        </p>
        {charging !== null && <Plug aria-hidden="true" />}
      </div>
      <div className="problem-row">
        <StageProblemGiftBox box={plugged} locale={props.locale} />
        <StageProblemGiftBox box={unplugged} locale={props.locale} />
        <div className="battery-goal">
          <StageProblemGiftBox box={high} locale={props.locale} />
          <div className="battery-range" data-high="true" aria-hidden="true" />
          <span>≥75%</span>
        </div>
        <div className="battery-goal">
          <StageProblemGiftBox box={low} locale={props.locale} />
          <div className="battery-range" data-high="false" aria-hidden="true" />
          <span>&lt;75%</span>
        </div>
      </div>
      {error && <p role="status">{statusText(props.locale, "error")}</p>}
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: PowerOutlined,
      tone: "green",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: PowerOffOutlined,
      tone: "rose",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: BatteryFullOutlined,
      tone: "amber",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: Battery2BarOutlined,
      tone: "amber",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "getBattery" in navigator ? "available" : "unsupported",
    ),
  Component: S370Stage,
});
