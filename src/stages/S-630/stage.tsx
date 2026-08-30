import BluetoothOutlined from "@mui/icons-material/BluetoothOutlined";
import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

type NetworkInformationLike = EventTarget & { readonly type?: string };

const boxIdByType = {
  wifi: manifest.box.B01,
  cellular: manifest.box.B02,
  ethernet: manifest.box.B03,
  bluetooth: manifest.box.B04,
} as const;

/**
 * S-630
 *
 * 目的: Network Information APIが報告する実network routeの種類を、端末外側で切り替えて4箱へ収集する。
 * 最初の一手: Wi-Fi、携帯回線、有線、Bluetooth tetheringのいずれかへ端末側で接続し、「現在の回線を見る」を押す。
 * 箱ごとの解法:
 * - B01「Wi-Fiの箱」: 明示buttonを押した瞬間の`navigator.connection.type`が厳密に`wifi`なら開く。
 * - B02「携帯回線の箱」: 同じ読取値が厳密に`cellular`なら開く。
 * - B03「有線の箱」: 同じ読取値が厳密に`ethernet`なら開く。
 * - B04「Bluetoothの箱」: 同じ読取値が厳密に`bluetooth`なら開く。訪問をまたいだ4接続の開箱は通常進捗へ累積する。
 * 使用API: Network Information APIの`Navigator.connection`と`NetworkInformation.type`。
 * 権限・privacy: 接続名、SSID、IP address、速度、時刻は取得せず、4値に一致したproblem ID以外を保存・同期・送信しない。
 * 対応環境: `navigator.connection.type`を具体値として公開するAndroid / ChromeOS等のbrowser。欠損環境で推定fallbackを出さない。
 */
function S630Stage(props: Props) {
  const problems = [
    props.boxes[manifest.box.B01],
    props.boxes[manifest.box.B02],
    props.boxes[manifest.box.B03],
    props.boxes[manifest.box.B04],
  ] as const;
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );

  const inspect = () => {
    const connection = (
      navigator as Navigator & { connection?: NetworkInformationLike }
    ).connection;
    const type = connection?.type;
    if (!type) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    const boxId = boxIdByType[type as keyof typeof boxIdByType];
    if (!boxId) {
      setStatus(`${stageText(props.locale, locale.ignored)} (${type})`);
      return;
    }
    props.boxes[boxId].solve();
    setStatus(`${stageText(props.locale, locale.observed)}: ${type}`);
  };

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
      <button type="button" className="stage-action" onClick={inspect}>
        {stageText(props.locale, locale.inspect)}
      </button>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DevicesOutlined,
      color: "#38bdf8",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: DevicesOutlined,
      color: "#fb7185",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: DevicesOutlined,
      color: "#34d399",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: BluetoothOutlined,
      color: "#818cf8",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() => {
      const connection = (
        navigator as Navigator & { connection?: { type?: string } }
      ).connection;
      return typeof connection?.type === "string" ? "available" : "unsupported";
    }),
  Component: S630Stage,
});
