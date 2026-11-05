import "./styles.css";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-030
 *
 * 目的: 黒塗りの合言葉をnative text selectionで読めるようにし、その語全体を含む選択を観測する。
 * 最初の一手: 本文の角括弧内の黒塗り部分を、mouse dragまたはkeyboardの選択操作で反転選択する。
 * 箱ごとの解法:
 * - B01「点線の四角」: 黒塗りの合言葉全体を含めて反転選択する。実選択範囲の開始位置が合言葉の先頭以前、終了位置が末尾以後なら開く。合言葉だけの選択、文全体、Ctrl+Aによるpage全選択も成功する。
 * 使用API: Selection APIの`document.getSelection()`とDocumentの`selectionchange` event。
 * 権限・privacy: 権限を要求せず、現在の選択範囲は包含判定にだけ使用し、保存・同期・送信しない。
 * 対応環境: page本文をnative selectionでき、Selection APIと`selectionchange`を実装するbrowser。
 */
function S030Stage(props: Props) {
  const answer = stageText(props.locale, locale.answer);
  const problem = props.boxes[manifest.box.B01];
  const redactedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observeSelection = () => {
      const selection = document.getSelection();
      const text = redactedRef.current?.firstChild;
      if (selection?.rangeCount !== 1 || !text) return;
      const range = selection.getRangeAt(0);
      const passwordRange = document.createRange();
      passwordRange.selectNodeContents(text);
      if (
        range.compareBoundaryPoints(Range.START_TO_START, passwordRange) <= 0 &&
        range.compareBoundaryPoints(Range.END_TO_END, passwordRange) >= 0
      ) {
        problem.solve();
      }
    };
    document.addEventListener("selectionchange", observeSelection);
    props.signal.addEventListener(
      "abort",
      () => document.removeEventListener("selectionchange", observeSelection),
      { once: true },
    );
    return () =>
      document.removeEventListener("selectionchange", observeSelection);
  }, [problem.solve, props.signal]);

  return (
    <div className="puzzle puzzle--centered selection-puzzle">
      <p>
        {stageText(props.locale, locale.sentenceStart)}
        <span className="selection-redacted" ref={redactedRef}>
          {answer}
        </span>
        {stageText(props.locale, locale.sentenceEnd)}
      </p>
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SelectAllOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      typeof document.getSelection === "function" ? "available" : "unsupported",
    ),
  Component: S030Stage,
});
