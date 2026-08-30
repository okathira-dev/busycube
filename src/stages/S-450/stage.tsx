import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

const key = "busycube:S-450:round";
/**
 * S-450
 *
 * 目的: installed Busycubeへ登録したcustom protocolをOS/browser経由で起動し、送出時と受信時のrandom roundを照合する。
 * 最初の一手: Busycubeをinstallして「専用の合図を送る」を押し、OS/browserの確認UIで`web+busycube:` linkをBusycubeに開かせる。
 * 箱ごとの解法:
 * - B01「プロトコルの箱」: 初期URLまたはLaunchQueue target URLの`protocol`をdecodeし、`web+busycube:open?round=`に続く値が送出直前にlocalStorageへ保存したroundと完全一致すると開く。
 * 使用API: Web App Manifest `protocol_handlers`、custom protocol navigation、Launch Handler API、URL API、Web Crypto UUID、localStorage。
 * 権限・privacy: protocol URLには一時random roundだけを載せ、受信後の一致判定以外に使用しない。外部app情報やlaunch履歴を保存・送信しない。
 * 対応環境: Busycubeをinstallでき、`web+busycube` protocol handler登録とLaunchQueue target URLを実装するbrowser/OS。
 */
function S450Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const round = useMemo(() => crypto.randomUUID(), []);
  const [status, setStatus] = useState("waiting");
  useEffect(() => {
    const inspect = (target: string) => {
      const outer = new URL(target, location.href);
      const protocol = outer.searchParams.get("protocol");
      if (!protocol) return;
      const value = decodeURIComponent(protocol);
      if (value === `web+busycube:open?round=${localStorage.getItem(key)}`) {
        problem.solve();
        setStatus("launched");
      }
    };
    inspect(location.href);
    let active = true;
    window.launchQueue?.setConsumer((params) => {
      if (active) inspect(params.targetURL);
    });
    return () => {
      active = false;
    };
  }, [problem.solve]);
  const arm = () => {
    localStorage.setItem(key, round);
    location.href = `web+busycube:open?round=${round}`;
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <button type="button" className="stage-action" onClick={arm}>
        {stageText(props.locale, locale.sendPrivateSignal)}
      </button>
      <p role="status">{statusText(props.locale, status)}</p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: OpenInNewOutlined,
      color: "#60a5fa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "launchQueue" in window ? "available" : "unsupported",
    ),
  Component: S450Stage,
});
