import "./styles.css";
import SportsEsportsOutlined from "@mui/icons-material/SportsEsportsOutlined";
import { useEffect, useId, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import {
  isGamepadComplete,
  type PadInput,
  readGamepadInputs,
} from "./functions";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

function circlePath(x: number, y: number, radius: number) {
  return `M ${x - radius} ${y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
}

/**
 * S-200
 *
 * 目的: 実機に近い形のコントローラー図を手掛かりに、全操作を試して一つの箱を開く。
 * 最初の一手: 接続したgamepadのbuttonやstickを動かし、図の反応を調べる。
 * 箱ごとの解法:
 * - B11「ゲームパッド」: 十字キーと左右stickを上下左右に動かし、右手四button、L/R、ZL/ZR、左右stick押し込み、中央二buttonをそれぞれ押す。同じ挑戦中にstandard mappingのbuttons 0〜15すべてのpressedまたはvalue>0.75と、axes 0〜3それぞれの正負0.65以上を観測すると開く。同時入力は不要。
 * 使用API: navigator.getGamepads、standard mappingのbuttons/axes、requestAnimationFrame。
 * 権限・privacy: 権限を要求せず、入力の印だけを挑戦中に保持する。機器ID・生入力履歴を保存・送信しない。
 * 対応環境: Gamepad APIでstandard mappingのcontrollerを公開するブラウザー。home/captureは必須にしない。
 */
function S200Stage(props: Props) {
  const controlId = useId();
  const box = useRef(props.boxes.B11);
  box.current = props.boxes.B11;
  const [seen, setSeen] = useState<ReadonlySet<PadInput>>(new Set());
  const [active, setActive] = useState<ReadonlySet<PadInput>>(new Set());
  useEffect(() => {
    let frame = 0;
    let previous = "";
    const observed = new Set<PadInput>();
    let solved = false;
    const poll = () => {
      if (props.signal.aborted) return;
      let pads: (Gamepad | null)[];
      try {
        pads = navigator.getGamepads();
      } catch {
        setActive(new Set());
        return;
      }
      const inputs = readGamepadInputs(pads);
      let changed = false;
      for (const input of inputs) {
        if (!observed.has(input)) {
          observed.add(input);
          changed = true;
        }
      }
      const signature = [...inputs].sort().join(",");
      if (signature !== previous) {
        setActive(inputs);
        previous = signature;
      }
      if (changed) {
        setSeen(new Set(observed));
        if (!solved && isGamepadComplete(observed)) {
          solved = true;
          box.current.solve();
        }
      }
      frame = requestAnimationFrame(poll);
    };
    if (typeof navigator.getGamepads === "function")
      frame = requestAnimationFrame(poll);
    const stop = () => cancelAnimationFrame(frame);
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  const inputShape = (input: PadInput, d: string, transform?: string) => (
    <path
      key={input}
      className="gamepad-input"
      data-input={input}
      data-seen={seen.has(input)}
      data-active={active.has(input)}
      d={d}
      transform={transform}
      fill={`url(#${controlId})`}
    />
  );
  const stick = (side: "ls" | "rs", x: number) => {
    const dx =
      Number(active.has(`${side}-right`)) - Number(active.has(`${side}-left`));
    const dy =
      Number(active.has(`${side}-down`)) - Number(active.has(`${side}-up`));
    const arc =
      "M -36 -36 A 51 51 0 0 1 36 -36 L 28 -28 A 40 40 0 0 0 -28 -28 Z";
    return (
      <g
        className="gamepad-stick"
        data-part={`${side === "ls" ? "left" : "right"}-stick`}
        transform={`translate(${x} 290)`}
      >
        <circle className="gamepad-stick-well" r="56" />
        {inputShape(`${side}-up`, arc)}
        {inputShape(`${side}-left`, arc, "rotate(-90)")}
        {inputShape(`${side}-down`, arc, "rotate(180)")}
        {inputShape(`${side}-right`, arc, "rotate(90)")}
        {inputShape(
          side === "ls" ? "L3" : "R3",
          circlePath(0, 0, 33),
          `translate(${dx * 9} ${dy * 9})`,
        )}
        <circle className="gamepad-stick-rim" cx={dx * 9} cy={dy * 9} r="25" />
      </g>
    );
  };

  return (
    <div className="puzzle puzzle--centered gamepad-puzzle">
      <div className="gamepad-layout">
        <svg
          className="gamepad-diagram"
          viewBox="0 0 680 380"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={controlId}>
              <stop offset="0" stopColor="#343044" />
              <stop offset="1" stopColor="#171320" />
            </radialGradient>
          </defs>
          <g transform="translate(0 20)">
            {inputShape(
              "ZL",
              "M 130 82 L 126 42 Q 126 24 145 22 L 178 22 Q 194 24 192 42 L 187 82 Z",
            )}
            {inputShape(
              "ZR",
              "M 130 82 L 126 42 Q 126 24 145 22 L 178 22 Q 194 24 192 42 L 187 82 Z",
              "translate(680 0) scale(-1 1)",
            )}
          </g>
          <g>
            {inputShape(
              "L",
              "M 91 104 L 99 77 Q 105 62 128 62 L 201 65 Q 218 66 222 84 L 222 105 Z",
            )}
            {inputShape(
              "R",
              "M 91 104 L 99 77 Q 105 62 128 62 L 201 65 Q 218 66 222 84 L 222 105 Z",
              "translate(680 0) scale(-1 1)",
            )}
          </g>
          <g data-part="dpad" transform="translate(174 190)">
            <path
              className="gamepad-dpad-center"
              d="M -11 -11 H 11 V 11 H -11 Z"
            />
            {inputShape(
              "up",
              "M -12 -13 L -20 -28 L -20 -47 Q 0 -52 20 -47 L 20 -28 L 12 -13 Z",
            )}
            {inputShape(
              "left",
              "M -12 -13 L -20 -28 L -20 -47 Q 0 -52 20 -47 L 20 -28 L 12 -13 Z",
              "rotate(-90)",
            )}
            {inputShape(
              "down",
              "M -12 -13 L -20 -28 L -20 -47 Q 0 -52 20 -47 L 20 -28 L 12 -13 Z",
              "rotate(180)",
            )}
            {inputShape(
              "right",
              "M -12 -13 L -20 -28 L -20 -47 Q 0 -52 20 -47 L 20 -28 L 12 -13 Z",
              "rotate(90)",
            )}
          </g>
          <g data-part="face">
            {inputShape("face-top", circlePath(506, 145, 19))}
            {inputShape("face-left", circlePath(461, 190, 19))}
            {inputShape("face-bottom", circlePath(506, 235, 19))}
            {inputShape("face-right", circlePath(551, 190, 19))}
          </g>
          <g data-part="center">
            {inputShape("select", "M 264 192 L 284 197 L 280 215 L 260 210 Z")}
            {inputShape("start", "M 416 192 L 396 197 L 400 215 L 420 210 Z")}
          </g>
          {stick("ls", 239)}
          {stick("rs", 441)}
        </svg>
        <div className="gamepad-reward">
          <StageProblemGiftBox box={props.boxes.B11} locale={props.locale} />
        </div>
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    B11: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "getGamepads" in navigator ? "available" : "unsupported",
    ),
  Component: S200Stage,
});
