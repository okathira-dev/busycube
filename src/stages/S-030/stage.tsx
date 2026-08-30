import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-030
 *
 * 目的: 入力欄へ回答する代わりに、文章内の指定語そのものをnative text selectionとして観測する。
 * 最初の一手: 角括弧内の太字の一語だけを、mouse dragまたはkeyboardの選択操作で反転選択する。
 * 箱ごとの解法:
 * - B01「選択の箱」: 選択範囲を文字列化し、前後空白を除いて小文字化した結果が、現在localeの回答語（日本語「あいだ」／英語`between`）と完全一致すると開く。
 * 使用API: Selection APIの`document.getSelection()`とDocumentの`selectionchange` event。
 * 権限・privacy: 権限を要求せず、現在の選択文字列は一致判定にだけ使用し、保存・同期・送信しない。
 * 対応環境: page本文をnative selectionでき、Selection APIと`selectionchange`を実装するbrowser。
 */
function S030Stage(props: Props) {
  const answer = stageText(props.locale, locale.answer);
  const problem = props.boxes[manifest.box.B01];

  useEffect(() => {
    const observeSelection = () => {
      if (document.getSelection()?.toString().trim().toLowerCase() === answer) {
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
  }, [answer, problem.solve, props.signal]);

  return (
    <div className="puzzle puzzle--centered selection-puzzle">
      <p>
        [ <strong>{answer}</strong> ]
      </p>
      <p>{stageText(props.locale, locale.sentence)}</p>
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
