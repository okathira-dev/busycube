import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useState } from "react";

/**
 * S-370
 *
 * 目的: 端末batteryの充電接続変化と残量75%の境界をBattery Status APIの別状態として収集する。
 * 最初の一手: 入場後の残量でB03/B04を確認し、chargerを一度接続してから取り外してB01/B02を開く。
 * 箱ごとの解法:
 * - B01「接続の箱」: `chargingchange` event発生時に`battery.charging === true`なら開く。
 * - B02「取り外しの箱」: `chargingchange` event発生時に`battery.charging === false`なら開く。
 * - B03「75%以上の箱」: `getBattery()`取得直後または`levelchange`時に`battery.level >= 0.75`なら開く。
 * - B04「75%未満の箱」: 同じ残量観測で`battery.level < 0.75`なら開く。訪問をまたいで両側の残量を通常進捗へ累積できる。
 * 使用API: Battery Status APIの`navigator.getBattery()`、BatteryManager `charging` / `level`とchange events。
 * 権限・privacy: 権限を要求せず、充電booleanと丸めた残量だけを判定・表示し、battery履歴や端末情報を保存・送信しない。
 * 対応環境: Battery Status APIをpageへ公開し、charger接続とlevel変化をeventとして報告するbrowser/端末。
 */
function S370Stage(props: Props) {
  const plugged = props.boxes[manifest.box.B01];
  const unplugged = props.boxes[manifest.box.B02];
  const high = props.boxes[manifest.box.B03];
  const low = props.boxes[manifest.box.B04];
  const [status, setStatus] = useState("…");
  useEffect(() => {
    let battery: BatteryManager | undefined;
    const inspectLevel = () => {
      if (!battery) return;
      setStatus(`${Math.round(battery.level * 100)}%`);
      if (battery.level >= 0.75) high.solve();
      else low.solve();
    };
    const inspectCharging = () => {
      if (!battery) return;
      if (battery.charging) plugged.solve();
      else unplugged.solve();
    };
    void navigator.getBattery?.().then((manager) => {
      if (props.signal.aborted) return;
      battery = manager;
      inspectLevel();
      battery.addEventListener("levelchange", inspectLevel);
      battery.addEventListener("chargingchange", inspectCharging);
    });
    return () => {
      battery?.removeEventListener("levelchange", inspectLevel);
      battery?.removeEventListener("chargingchange", inspectCharging);
    };
  }, [high.solve, low.solve, plugged.solve, props.signal, unplugged.solve]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {[plugged, unplugged, high, low].map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <p className="measurement">{status}</p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: WbSunnyOutlined,
      color: "#34d399",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: WbSunnyOutlined,
      color: "#fb7185",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: BadgeOutlined,
      color: "#facc15",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: BadgeOutlined,
      color: "#f59e0b",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "getBattery" in navigator ? "available" : "unsupported",
    ),
  Component: S370Stage,
});
