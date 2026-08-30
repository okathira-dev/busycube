import SignalWifiOffOutlined from "@mui/icons-material/SignalWifiOffOutlined";
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
 * S-070
 *
 * 目的: network requestの成否ではなく、browserが報告する端末のonline/offline状態を直接観測する。
 * 最初の一手: Wi-Fiやmobile dataを端末の標準UIで切り、browserをoffline状態にする。
 * 箱ごとの解法:
 * - B01「オフラインの箱」: 入場時またはonline/offline event発生時に`navigator.onLine`が厳密に`false`なら開く。
 * 使用API: `navigator.onLine`、Windowの`online` / `offline` event。capability判定ではService WorkerとCache APIも確認する。
 * 権限・privacy: 権限を要求せず、onlineかofflineかのbooleanだけを現在表示と開箱判定に使い、接続情報は保存・送信しない。
 * 対応環境: Service WorkerとCache APIを実装し、端末の切断を`navigator.onLine === false`として報告するbrowser。
 */
function S070Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const observe = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) problem.solve();
    };
    window.addEventListener("online", observe);
    window.addEventListener("offline", observe);
    observe();
    return () => {
      window.removeEventListener("online", observe);
      window.removeEventListener("offline", observe);
    };
  }, [problem.solve]);

  return (
    <div className="puzzle puzzle--centered">
      <div
        className={`signal-clue ${online ? "" : "signal-clue--offline"}`}
        aria-hidden="true"
      >
        ⌁
      </div>
      <p role="status">{online ? "•••" : "×"}</p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SignalWifiOffOutlined,
      color: "#2dd4bf",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "serviceWorker" in navigator && "caches" in window
        ? "available"
        : "unsupported",
    ),
  Component: S070Stage,
});
