import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
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

/**
 * S-170
 *
 * 目的: browserが動かす往復animationを利用者のtimingでpauseし、timeline中央付近の実進捗を読み取る。
 * 最初の一手: 横へ往復するmarkerを見て、中央へ来た瞬間に「止める／動かす」を押してpauseする。
 * 箱ごとの解法:
 * - B01「時間の箱」: pause直後の`getComputedTiming().progress`が0.5±0.1、すなわち0.4〜0.6なら開く。pause中の再押下は再生するだけで判定しない。
 * 使用API: Web Animations APIの`Element.animate()`、`Animation.playState` / `pause()` / `play()`、`getComputedTiming()`。
 * 権限・privacy: 権限を要求せず、animation進捗は現在表示と開箱判定にだけ使い、操作timingを保存・送信しない。
 * 対応環境: Element.animateとWeb Animations APIのtiming情報を実装するbrowser。
 */
function S170Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const markerRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const animation = marker.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(16rem)" }],
      {
        duration: 2400,
        iterations: Number.POSITIVE_INFINITY,
        direction: "alternate",
      },
    );
    animationRef.current = animation;
    return () => animation.cancel();
  }, []);

  const toggle = () => {
    const animation = animationRef.current;
    if (!animation) return;
    if (animation.playState === "paused") {
      animation.play();
      setProgress(null);
      return;
    }
    animation.pause();
    const value = animation.effect?.getComputedTiming().progress;
    const nextProgress = typeof value === "number" ? value : 0;
    setProgress(nextProgress);
    if (Math.abs(nextProgress - 0.5) <= 0.1) {
      problem.solve();
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="timeline-clue" aria-hidden="true">
        <span ref={markerRef} />
      </div>
      <p className="measurement" aria-live="polite">
        {progress === null ? "…" : `${Math.round(progress * 100)}%`}
      </p>
      <button type="button" className="stage-action" onClick={toggle}>
        {stageText(props.locale, locale.pausePlay)}
      </button>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ScheduleOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "animate" in Element.prototype ? "available" : "unsupported",
    ),
  Component: S170Stage,
});
