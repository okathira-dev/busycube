import "./styles.css";
import PauseOutlined from "@mui/icons-material/PauseOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
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
 * 目的: browserが動かす縦型の往復メーターを利用者のtimingでpauseし、上端の目標帯へ合わせる。
 * 最初の一手: 上下するメーターが上端の目標帯へ入った瞬間に停止アイコンを押す。
 * 箱ごとの解法:
 * - B02「時計」: メーターが上端の目標帯へ入ったときに停止アイコンを押す。実WAAPIをpauseした直後のgetComputedTiming().progressが0.95以上1以下なら開く。再開で再挑戦できる。
 * 使用API: Web Animations APIの`Element.animate()`、`Animation.playState` / `pause()` / `play()`、`getComputedTiming()`。
 * 権限・privacy: 権限を要求せず、animation進捗は現在表示と開箱判定にだけ使い、操作timingを保存・送信しない。
 * 対応環境: Element.animateとWeb Animations APIのtiming情報を実装するbrowser。
 */
function S170Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const markerRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof marker.animate !== "function") return;
    const animation = marker.animate(
      [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
      {
        duration: 2400,
        iterations: Number.POSITIVE_INFINITY,
        direction: "alternate",
        easing: "linear",
      },
    );
    animationRef.current = animation;
    const cleanup = () => {
      animation.cancel();
      animationRef.current = null;
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal]);

  const toggle = () => {
    const animation = animationRef.current;
    if (!animation || props.signal.aborted) return;
    if (animation.playState === "paused") {
      animation.play();
      setPaused(false);
      return;
    }
    animation.pause();
    const value = animation.effect?.getComputedTiming().progress;
    setPaused(true);
    if (typeof value === "number" && value >= 0.95 && value <= 1) {
      problem.solve();
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="timing-meter" aria-hidden="true">
        <span ref={markerRef} className="timing-meter__fill" />
        <span className="timing-meter__target" />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={toggle}
        aria-label={stageText(
          props.locale,
          paused ? locale.play : locale.pause,
        )}
      >
        {paused ? (
          <PlayArrowOutlined aria-hidden="true" />
        ) : (
          <PauseOutlined aria-hidden="true" />
        )}
      </button>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: ScheduleOutlined,
      color: "#fbbf24",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "animate" in Element.prototype ? "available" : "unsupported",
    ),
  Component: S170Stage,
});
