import "./styles.css";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { useRef } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { cipher, copyCipher } from "./cipher";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-500
 *
 * 目的: 暗号文の選択範囲だけをcopy時に復号し、その結果を実pasteで返す。
 * 最初の一手: 暗号文を選択してcopyし、「ここへ戻す」のinputへpasteして内容を確かめる。
 * 箱ごとの解法:
 * - B02「点線の四角」: 暗号文内のexvbfxehだけを選択して実copyし、復号結果busycubeをinputへ実pasteすると開く。今回のtrusted copyで一つの非空Rangeの両端が暗号文内にあり、選択範囲だけを三文字戻してclipboardへ設定できたことと、trusted pasteのtext/plainが厳密にbusycubeであることを確認する。全文pasteや貼付後の再選択は不要。
 * 使用API: ClipboardEvent.clipboardData、Selection/Range、DOM containment、preventDefault。
 * 権限・privacy: 利用者の実copy/paste操作だけを扱い、Async Clipboardの自動readやpermission要求はしない。暗号文の選択範囲を復号して渡し、貼付先はnative inputが実pasteした内容を表示する。内容を保存・送信しない。
 * 対応環境: secure contextでnative copy/paste、ClipboardEvent DataTransferとSelection/Rangeを提供するbrowser。
 */
function S500Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const sourceRef = useRef<HTMLParagraphElement>(null);
  const copiedAnswer = useRef(false);
  const solved = useRef(false);
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <p
        ref={sourceRef}
        className="cipher-text"
        onCopy={(event) => {
          if (props.signal.aborted || !event.nativeEvent.isTrusted) return;
          copiedAnswer.current = false;
          const root = sourceRef.current;
          if (!root) return;
          copiedAnswer.current =
            copyCipher(root, document.getSelection(), {
              isTrusted: event.nativeEvent.isTrusted,
              clipboardData: event.clipboardData,
              preventDefault: () => event.preventDefault(),
            }) === "busycube";
        }}
      >
        {cipher}
      </p>
      <label className="paste-target">
        {stageText(props.locale, locale.returnHere)}
        <input
          type="text"
          onPaste={(event) => {
            if (
              props.signal.aborted ||
              solved.current ||
              !event.nativeEvent.isTrusted ||
              !copiedAnswer.current
            )
              return;
            if (event.clipboardData.getData("text/plain") !== "busycube")
              return;
            solved.current = true;
            problem.solve();
          }}
        />
      </label>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: SelectAllOutlined,
      color: "#818cf8",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "ClipboardEvent" in window &&
      typeof document.getSelection === "function"
        ? "permission-required"
        : "unsupported",
    ),
  Component: S500Stage,
});
