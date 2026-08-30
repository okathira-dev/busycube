import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import { flushSync } from "react-dom";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-340
 *
 * 目的: 三つのshapeの並び替えをView Transitionとして完了させ、単なるstate変更ではなくtransitionの終了を待つ。
 * 最初の一手: 「形をつなぐ」を押し、◆・●・▲の並び替えanimationが終わるたびにもう一度押して計3回進める。
 * 箱ごとの解法:
 * - B01「画面遷移の箱」: `document.startViewTransition()`内でstepを1ずつ進め、各`finished` promiseがresolveした後のstepが3以上になると開く。
 * 使用API: View Transitions APIの`document.startViewTransition()` / `ViewTransition.finished`とReact `flushSync()`。
 * 権限・privacy: 権限・外部入力を使用せず、attempt内stepだけを表示・判定し、操作履歴を保存・送信しない。
 * 対応環境: same-document View Transitions APIを実装し、transitionの完了promiseを提供するbrowser。
 */
function S340Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [step, setStep] = useState(0);
  const tokens = ["◆", "●", "▲"];

  const move = async () => {
    const next = step + 1;
    const transition = document.startViewTransition(() => {
      flushSync(() => setStep(next));
    });
    await transition.finished;
    if (props.signal.aborted) return;
    if (next >= 3) problem.solve();
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="transition-tiles" data-step={step % 3} aria-hidden="true">
        {tokens.map((token, index) => (
          <span key={token} style={{ order: (index + step) % 3 }}>
            {token}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void move()}
      >
        {stageText(props.locale, locale.connectShapes)}
      </button>
      <p className="measurement">{Math.min(step, 3)} / 3</p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SwapHorizOutlined,
      color: "#34d399",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "startViewTransition" in document ? "available" : "unsupported",
    ),
  Component: S340Stage,
});
