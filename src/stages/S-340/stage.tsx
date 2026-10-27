import "./styles.css";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  resolveStageBoxColor,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { GiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { randomIndex, shuffleAllPositions } from "./functions";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type Phase =
  | "showing"
  | "closing"
  | "moving"
  | "choosing"
  | "wrong"
  | "done"
  | "error";

const tokenIdentities = Array.from({ length: 10 }, (_, identity) => identity);

/**
 * S-340
 *
 * 目的: 円環上の十箱のうち、提示された当たりを実View Transitionの移動中に追跡する。
 * 最初の一手: 蓋が開いた当たりの箱を見て、中央の矢印からシャッフルを開始する。
 * 箱ごとの解法:
 * - B02「左右の矢印」: 提示中の当たりを覚えて中央の矢印を押し、全箱が移動する間も追跡し、回答画面でその箱を押す。実ViewTransition.readyとfinishedの成功後にのみ選択可能となり、当たりのidentityを選べば開く。外れは揺れた後に新しい当たりを提示し、中央の矢印から再挑戦する。
 * 使用API: document.startViewTransition、ViewTransition.ready/finished/skipTransition、React flushSync、Web Crypto乱数。
 * 権限・privacy: 権限を要求せず、十箱の位置・当たり・選択を挑戦中だけ保持し保存・送信しない。
 * 対応環境: 要素の同一性をview-transition-nameで追跡できるsame-document View Transitions対応ブラウザー。
 */
function S340Stage(props: Props) {
  const problem = props.boxes.B02;
  const [positions, setPositions] = useState(() =>
    Array.from({ length: 10 }, (_, i) => i),
  );
  const [winner, setWinner] = useState(() => randomIndex(10));
  const [phase, setPhase] = useState<Phase>("showing");
  const [wrong, setWrong] = useState<number | null>(null);
  const transitionRef = useRef<ViewTransition | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const stop = () => {
      transitionRef.current?.skipTransition();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  const shuffle = async () => {
    if (
      busy.current ||
      props.signal.aborted ||
      (phase !== "showing" && phase !== "error")
    )
      return;
    busy.current = true;
    try {
      // The outgoing snapshot must already conceal the open lid.
      flushSync(() => setPhase("closing"));
      const next = shuffleAllPositions(positions);
      const transition = document.startViewTransition(() => {
        if (props.signal.aborted) return;
        flushSync(() => {
          setPositions(next);
          setPhase("moving");
        });
      });
      transitionRef.current = transition;
      await Promise.all([transition.ready, transition.finished]);
      if (!props.signal.aborted) setPhase("choosing");
    } catch {
      if (!props.signal.aborted) setPhase("error");
    } finally {
      transitionRef.current = null;
      busy.current = false;
    }
  };
  const choose = (identity: number) => {
    if (phase !== "choosing" || props.signal.aborted) return;
    if (identity === winner) {
      setPhase("done");
      problem.solve();
      return;
    }
    setWrong(identity);
    setPhase("wrong");
    retryTimer.current = setTimeout(() => {
      if (props.signal.aborted) return;
      setWinner((current) => (current + 1 + randomIndex(9)) % 10);
      setWrong(null);
      setPhase("showing");
    }, 600);
  };
  return (
    <div className="puzzle puzzle--centered shuffle-puzzle">
      <div className="shuffle-ring" data-phase={phase}>
        {tokenIdentities.map((identity) => {
          const position = positions[identity];
          if (position === undefined) throw new Error("Missing box position");
          const angle = (position * Math.PI * 2) / 10 - Math.PI / 2;
          return (
            <div
              key={identity}
              className="shuffle-token"
              data-wrong={wrong === identity}
              style={{
                left: `${50 + 40 * Math.cos(angle)}%`,
                top: `${50 + 40 * Math.sin(angle)}%`,
                viewTransitionName: `s340-box-${identity}`,
              }}
            >
              <button
                type="button"
                aria-label={stageText(props.locale, locale.box)}
                disabled={phase !== "choosing"}
                onClick={() => choose(identity)}
              >
                <GiftBox
                  decorative
                  size="compact"
                  state={
                    (phase === "showing" ||
                      phase === "error" ||
                      phase === "done") &&
                    identity === winner
                      ? "open"
                      : "closed"
                  }
                  color={resolveStageBoxColor(problem.definition)}
                  label=""
                />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="stage-action shuffle-start"
          aria-label={stageText(props.locale, locale.shuffle)}
          disabled={phase !== "showing" && phase !== "error"}
          onClick={() => void shuffle()}
        >
          <SwapHorizOutlined aria-hidden="true" />
        </button>
      </div>
      {phase === "error" && (
        <p role="status">{stageText(props.locale, locale.failed)}</p>
      )}
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: SwapHorizOutlined,
      tone: "green",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "startViewTransition" in document ? "available" : "unsupported",
    ),
  Component: S340Stage,
});
