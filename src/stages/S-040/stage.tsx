import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";

/**
 * S-040
 *
 * 目的: このpageがhiddenになってからvisibleへ戻るまでの実経過時間を測り、短い不在と長い不在を区別する。
 * 最初の一手: 別tabまたは別appへ切り替えてこのpageを見えない状態にし、まず2秒以上待ってから戻る。
 * 箱ごとの解法:
 * - B01「見ない時間の箱」: `visibilityState`が`hidden`になった後、2,000 ms以上経過して`visible`へ戻ると開く。
 * - B02「長い不在の箱」: 同じhidden期間を25分以上保ってから`visible`へ戻ると開く。25分の復帰ではB01の条件も同時に満たす。
 * 使用API: Page Visibility APIの`document.visibilityState`と`visibilitychange`、単調増加時計`performance.now()`。
 * 権限・privacy: 権限を要求せず、直近のhidden開始時刻と復帰までの秒数だけをmemory上で扱い、時刻・閲覧先・滞在履歴は保存・送信しない。
 * 対応環境: Page Visibility APIとHigh Resolution Time APIを実装し、tab/app切替でpageがhiddenになるbrowser。
 */
function S040Stage(props: Props) {
  const hiddenAt = useRef<number | null>(null);
  const [hiddenSeconds, setHiddenSeconds] = useState(0);
  const problem = props.boxes[manifest.box.B01];
  const longProblem = props.boxes[manifest.box.B02];

  useEffect(() => {
    const observeVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = performance.now();
        return;
      }
      if (hiddenAt.current !== null) {
        const duration = performance.now() - hiddenAt.current;
        setHiddenSeconds(Math.floor(duration / 1000));
        if (duration >= 2000) problem.solve();
        if (duration >= 25 * 60 * 1000) longProblem.solve();
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", observeVisibility);
    props.signal.addEventListener(
      "abort",
      () => document.removeEventListener("visibilitychange", observeVisibility),
      { once: true },
    );
    return () =>
      document.removeEventListener("visibilitychange", observeVisibility);
  }, [longProblem.solve, problem.solve, props.signal]);

  return (
    <div className="puzzle puzzle--centered">
      <div className="eye-clue" aria-hidden="true">
        ◉
      </div>
      <p className="measurement" aria-live="polite">
        {hiddenSeconds || "…"}
      </p>
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
        <StageProblemGiftBox box={longProblem} locale={props.locale} />
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VisibilityOffOutlined,
      color: "#94a3b8",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: VisibilityOffOutlined,
      color: "#64748b",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "visibilityState" in document ? "available" : "unsupported",
    ),
  Component: S040Stage,
});
