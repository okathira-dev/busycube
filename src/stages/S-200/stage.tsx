import "./styles.css";
import SportsEsportsOutlined from "@mui/icons-material/SportsEsportsOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import {
  completedGamepadGroups,
  gamepadGroups,
  type PadInput,
  readGamepadInputs,
} from "./functions";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

const inputGlyph: Record<PadInput, string> = {
  up: "↑",
  left: "←",
  down: "↓",
  right: "→",
  "ls-up": "↑",
  "ls-left": "←",
  "ls-down": "↓",
  "ls-right": "→",
  "rs-up": "↑",
  "rs-left": "←",
  "rs-down": "↓",
  "rs-right": "→",
  "face-top": "△",
  "face-left": "□",
  "face-bottom": "×",
  "face-right": "○",
  L: "L",
  R: "R",
  ZL: "ZL",
  ZR: "ZR",
  L3: "L3",
  R3: "R3",
  select: "▱",
  start: "▷",
};

/**
 * S-200
 *
 * 目的: 標準gamepadの各部位を実操作し、画面の対応する印をそろえる。
 * 最初の一手: 接続したgamepadのbuttonやstickを動かし、図の反応を調べる。
 * 箱ごとの解法:
 * - B02「ゲームパッド」: 十字キーの上下左右をそれぞれ押す。standard mappingのbuttons 12〜15を同じ挑戦中にすべて観測すると開く。
 * - B03「ゲームパッド」: 左stickを上下左右へ倒す。axes 0/1の各正負0.65以上をすべて観測すると開く。
 * - B04「ゲームパッド」: 右stickを上下左右へ倒す。axes 2/3の各正負0.65以上をすべて観測すると開く。
 * - B05「ゲームパッド」: 右手の四buttonをそれぞれ押す。buttons 0〜3の全押下を観測すると開く。
 * - B06「ゲームパッド」: LとRの肩buttonをそれぞれ押す。buttons 4/5の両押下を観測すると開く。
 * - B07「ゲームパッド」: ZLとZRのtriggerをそれぞれ押す。buttons 6/7の両押下を観測すると開く。
 * - B08「ゲームパッド」: 左右のstickをそれぞれ押し込む。buttons 10/11の両押下を観測すると開く。
 * - B09「ゲームパッド」: 中央の選択・開始buttonをそれぞれ押す。buttons 8/9の両押下を観測すると開く。全button共通でpressedまたはvalue>0.75を押下とする。
 * 使用API: navigator.getGamepads、standard mappingのbuttons/axes、requestAnimationFrame。
 * 権限・privacy: 権限を要求せず、入力の印だけを挑戦中に保持する。機器ID・生入力履歴を保存・送信しない。
 * 対応環境: Gamepad APIでstandard mappingのcontrollerを公開するブラウザー。home/captureは必須にしない。
 */
function S200Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [seen, setSeen] = useState<ReadonlySet<PadInput>>(new Set());
  const [active, setActive] = useState<ReadonlySet<PadInput>>(new Set());
  useEffect(() => {
    let frame = 0;
    let previous = "";
    const observed = new Set<PadInput>();
    const solved = new Set<string>();
    const poll = () => {
      if (props.signal.aborted) return;
      const inputs = readGamepadInputs(navigator.getGamepads());
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
        for (const box of completedGamepadGroups(observed)) {
          if (!solved.has(box)) {
            solved.add(box);
            boxes.current[box].solve();
          }
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

  return (
    <div className="puzzle puzzle--centered">
      <div className="gamepad-diagram">
        {gamepadGroups.map((group) => (
          <div key={group.box} className="gamepad-group" data-part={group.name}>
            <div className="gamepad-inputs" aria-hidden="true">
              {group.inputs.map((input) => (
                <span
                  key={input}
                  data-seen={seen.has(input)}
                  data-active={active.has(input)}
                >
                  {inputGlyph[input]}
                </span>
              ))}
            </div>
            <StageProblemGiftBox
              box={props.boxes[group.box]}
              locale={props.locale}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    B02: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B03: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B04: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B05: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B06: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B07: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B08: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
    B09: { icon: SportsEsportsOutlined, tone: "rose", label: locale.box },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "getGamepads" in navigator ? "available" : "unsupported",
    ),
  Component: S200Stage,
});
