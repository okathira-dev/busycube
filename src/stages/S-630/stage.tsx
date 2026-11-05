import BluetoothOutlined from "@mui/icons-material/BluetoothOutlined";
import CableOutlined from "@mui/icons-material/CableOutlined";
import SignalCellularAltOutlined from "@mui/icons-material/SignalCellularAltOutlined";
import WifiOutlined from "@mui/icons-material/WifiOutlined";
import { useEffect, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type NetworkInformationLike = EventTarget & { readonly type?: string };
function connection() {
  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
}

/**
 * S-630
 *
 * 目的: 実NetworkInformation.typeの初回値と変化から、四種類のネット接続を集める。
 * 最初の一手: 入場時に開いた箱を見て、端末の接続方法を切り替える。
 * 箱ごとの解法:
 * - B01「Wi-Fi」: 端末をWi-Fiへ接続する。初期値またはchange時の実connection.typeが厳密にwifiなら開く。
 * - B02「携帯電波」: 端末を携帯回線へ接続する。実connection.typeが厳密にcellularなら開く。effectiveTypeの4g等からは推定しない。
 * - B03「ケーブル」: 端末を有線ネット接続へ変える。実connection.typeが厳密にethernetなら開く。
 * - B04「Bluetooth」: Bluetooth経由でネット接続する。実connection.typeが厳密にbluetoothなら開く。入場後の切替を必須とせず、各接続は訪問間で累積できる。
 * 使用API: navigator.connection、NetworkInformation.typeとchangeイベント。
 * 権限・privacy: 権限を要求せず、SSID・IP・機器名・速度を取得しない。接続種別や履歴を保存・送信しない。
 * 対応環境: connection.typeを具体値として公開するブラウザー・接続環境。missing/unknownや取得失敗を成功にしない。
 */
function S630Stage(props: Props) {
  const problems = [
    props.boxes.B01,
    props.boxes.B02,
    props.boxes.B03,
    props.boxes.B04,
  ] as const;
  const [wifi, cellular, ethernet, bluetooth] = problems.map(
    (problem) => problem.solve,
  );
  const [status, setStatus] = useState<"unavailable" | "unknown" | null>(null);
  useEffect(() => {
    const info = connection();
    const solved = new Set<string>();
    const inspect = () => {
      if (props.signal.aborted) return;
      if (!info || typeof info.type !== "string") {
        setStatus("unavailable");
        return;
      }
      const solve =
        info.type === "wifi"
          ? wifi
          : info.type === "cellular"
            ? cellular
            : info.type === "ethernet"
              ? ethernet
              : info.type === "bluetooth"
                ? bluetooth
                : undefined;
      if (!solve) {
        setStatus("unknown");
        return;
      }
      setStatus(null);
      if (!solved.has(info.type)) {
        solved.add(info.type);
        solve();
      }
    };
    inspect();
    info?.addEventListener("change", inspect);
    const stop = () => info?.removeEventListener("change", inspect);
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [wifi, cellular, ethernet, bluetooth, props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {problems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      {status && (
        <p role="status">
          {stageText(
            props.locale,
            status === "unavailable" ? locale.unavailable : locale.unknown,
          )}
        </p>
      )}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: { icon: WifiOutlined, tone: "cyan", label: locale.B01 },
    [manifest.box.B02]: {
      icon: SignalCellularAltOutlined,
      tone: "rose",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: CableOutlined,
      tone: "green",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: BluetoothOutlined,
      tone: "violet",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      typeof connection()?.type === "string" ? "available" : "unsupported",
    ),
  Component: S630Stage,
});
