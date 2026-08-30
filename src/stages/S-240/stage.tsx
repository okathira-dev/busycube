import InstallDesktopOutlined from "@mui/icons-material/InstallDesktopOutlined";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
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

type InteractionState = "idle" | "active" | "cancelled" | "unavailable";

/**
 * S-240
 *
 * 目的: BusycubeからOS共有sheetへ短い印を渡す向きと、installed BusycubeをOS共有先として起動する逆向きを確認する。
 * 最初の一手: 「共有する」を押して表示中の6文字markを任意の共有先へ渡す。B02はBusycubeをinstallし、別app/browserの共有sheetからBusycubeを選ぶ。
 * 箱ごとの解法:
 * - B01「共有の箱」: titleとrandom 6文字markを含むtextで`navigator.share()`を呼び、OS共有flowがcancelされずpromise resolveすると開く。
 * - B02「共有先の箱」: Web App Manifestのshare targetから`?stage=S-240&share-target=1`で起動され、入場URLの`share-target`が厳密に`1`なら開く。判定後parameterを除く。
 * 使用API: Web Share API、Web App Manifestの`share_target`、URL API、History API、Web Crypto UUID。
 * 権限・privacy: 外へ渡すのは固定titleと一時markだけで、共有先はOS UIで利用者が選ぶ。受信data本文は判定せず保存・再送信しない。
 * 対応環境: B01はWeb Share APIとOS共有sheet、B02はshare target対応browser/OSへBusycubeをinstallできる環境。
 */
function S240Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const targetProblem = props.boxes[manifest.box.B02];
  const mark = useMemo(() => crypto.randomUUID().slice(0, 6).toUpperCase(), []);
  const [status, setStatus] = useState<InteractionState>("idle");
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.get("share-target") === "1") {
      targetProblem.solve();
      url.searchParams.delete("share-target");
      history.replaceState(history.state, "", url);
    }
  }, [targetProblem.solve]);

  const share = async () => {
    try {
      await navigator.share({
        title: "Busycube",
        text: `${stageText(props.locale, locale.shareMark)} ${mark}`,
      });
      if (props.signal.aborted) return;
      // Only a resolved OS flow counts; opening and cancelling the sheet does not.
      problem.solve();
      setStatus("active");
    } catch (error) {
      if (props.signal.aborted) return;
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "cancelled"
          : "unavailable",
      );
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <code className="clipboard-token">{mark}</code>
      <button
        type="button"
        className="stage-action"
        onClick={() => void share()}
      >
        {stageText(props.locale, locale.share)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
        <StageProblemGiftBox box={targetProblem} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ShareOutlined,
      color: "#34d399",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: InstallDesktopOutlined,
      color: "#10b981",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "share" in navigator ? "permission-required" : "unsupported",
    ),
  Component: S240Stage,
});
