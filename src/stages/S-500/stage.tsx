import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

const plain = "follow the quiet marks until busycube appears between the noise";
const cipher = plain.replace(/[a-z]/g, (letter) =>
  String.fromCharCode(((letter.charCodeAt(0) - 97 + 3) % 26) + 97),
);

/**
 * S-500
 *
 * 目的: Caesar暗号表示からcopy eventで復号文をclipboardへ渡し、paste後に結果文中の答えだけをnative selectionする三段階を行う。
 * 最初の一手: 暗号文を選択してcopyし、「ここへ戻す」のinputへpasteする。現れた英文から`busycube`だけを反転選択する。
 * 箱ごとの解法:
 * - B01「選び出す箱」: 暗号文のcopy handlerが固定復号文をclipboardへ設定し、その同じ全文のpasteを確認した後、結果paragraph内のselection文字列が厳密に`busycube`なら開く。
 * 使用API: ClipboardEventの`clipboardData` read/writeとpreventDefault、Selection API、`selectionchange`、DOM containment判定。
 * 権限・privacy: stage固定の暗号文・復号文だけをclipboard経由で扱い、既存clipboard内容は読まない。copy/paste/selection内容を保存・送信しない。
 * 対応環境: native copy/paste、ClipboardEvent DataTransferとSelection APIを実装するsecure-context browser。
 */
function S500Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const targetRef = useRef<HTMLParagraphElement>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);

  useEffect(() => {
    const inspect = () => {
      const selection = document.getSelection();
      if (
        !copied ||
        !pasted ||
        !selection ||
        selection.toString() !== "busycube"
      )
        return;
      const node = selection.anchorNode;
      if (node && targetRef.current?.contains(node)) problem.solve();
    };
    document.addEventListener("selectionchange", inspect);
    return () => document.removeEventListener("selectionchange", inspect);
  }, [copied, pasted, problem.solve]);

  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <p
        className="cipher-text"
        onCopy={(event) => {
          event.preventDefault();
          event.clipboardData.setData("text/plain", plain);
          setCopied(true);
        }}
      >
        {cipher}
      </p>
      <label className="paste-target">
        {stageText(props.locale, locale.returnHere)}
        <input
          type="text"
          onPaste={(event) => {
            if (copied && event.clipboardData.getData("text/plain") === plain)
              setPasted(true);
          }}
        />
      </label>
      <p ref={targetRef} className="cipher-result">
        {pasted ? plain : "••••••••"}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SelectAllOutlined,
      color: "#818cf8",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "clipboard" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S500Stage,
});
