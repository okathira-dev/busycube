import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
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

type ClipboardStatus =
  | ""
  | "sentReversed"
  | "copyUnavailable"
  | "returnedUpright"
  | "clipboardUnreadable";

/**
 * S-180
 *
 * 目的: browser clipboardへ渡した逆順文字列をpage外で正順に直し、再読取した内容とattempt内の手順を確認する。
 * 最初の一手: 「逆さで渡す」で`ebucysub`をclipboardへ書き、外部editor等で`busycube`へ直してcopyし、「戻りを調べる」を押す。
 * 箱ごとの解法:
 * - B01「コピーの箱」: このattemptで`ebucysub`のclipboard書込が成功してarmedになった後、明示buttonで読み取ったclipboard textが厳密に`busycube`なら開く。
 * 使用API: Async Clipboard APIの`navigator.clipboard.writeText()` / `readText()`。
 * 権限・privacy: clipboard read/write権限はbutton操作時だけ利用する。固定challenge文字列だけを扱い、それ以外のclipboard内容を保存・表示・送信しない。
 * 対応環境: secure contextでAsync Clipboardのtext読書きを許可できるbrowser。
 */
function S180Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState<ClipboardStatus>("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText("ebucysub");
      if (props.signal.aborted) return;
      setArmed(true);
      setStatus("sentReversed");
    } catch {
      if (!props.signal.aborted) setStatus("copyUnavailable");
    }
  };

  const inspect = async () => {
    try {
      const value = await navigator.clipboard.readText();
      if (props.signal.aborted) return;
      if (armed && value === "busycube") {
        problem.solve();
        setStatus("returnedUpright");
      }
    } catch {
      if (!props.signal.aborted) setStatus("clipboardUnreadable");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <button
        type="button"
        className="stage-action"
        onClick={() => void copy()}
      >
        {stageText(props.locale, locale.copyReversed)}
      </button>
      <button
        type="button"
        className="stage-action"
        onClick={() => void inspect()}
      >
        {stageText(props.locale, locale.inspect)}
      </button>
      <p className="interaction-status" role="status">
        {status
          ? stageText(
              props.locale,
              locale[status as Exclude<ClipboardStatus, "">],
            )
          : null}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ContentCopyOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "clipboard" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S180Stage,
});
