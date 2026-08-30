import SportsEsportsOutlined from "@mui/icons-material/SportsEsportsOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

interface GamepadGesture {
  pressed: number;
  axis: number;
  complete: boolean;
}

export function readGamepadGesture(
  gamepads: readonly (Gamepad | null)[],
): GamepadGesture {
  const gamepad = gamepads.find((candidate) => candidate?.connected);
  if (!gamepad) return { pressed: 0, axis: 0, complete: false };
  const pressed = gamepad.buttons.filter(
    (button) => button.pressed || button.value > 0.75,
  ).length;
  const axis = Math.max(0, ...gamepad.axes.map((value) => Math.abs(value)));
  return { pressed, axis, complete: pressed >= 2 && axis >= 0.65 };
}

/**
 * S-200
 *
 * 目的: 接続済みgamepadの複数buttonとanalog axisを同じpoll frameで組み合わせた同時入力を観測する。
 * 最初の一手: gamepadを接続して任意のbuttonを2個以上押したまま、stickまたはtrigger相当のaxisを大きく倒す。
 * 箱ごとの解法:
 * - B01「同時入力の箱」: 最初に見つかったconnected gamepadで、pressedまたはvalue 0.75超のbuttonが2個以上かつ最大絶対axis値が0.65以上の同時状態になると開く。
 * 使用API: Gamepad APIの`navigator.getGamepads()`、GamepadButton状態、axis値、`requestAnimationFrame()` polling。
 * 権限・privacy: 権限を要求せず、button数と最大axis絶対値だけを現在表示に使い、device ID・mapping・入力履歴を保存・送信しない。
 * 対応環境: Gamepad APIを実装し、利用者操作後の接続gamepadとanalog axisをpageへ公開するbrowser。
 */
function S200Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [gesture, setGesture] = useState<GamepadGesture>({
    pressed: 0,
    axis: 0,
    complete: false,
  });

  useEffect(() => {
    let frame = 0;
    let previousUpdate = 0;
    const poll = (now: number) => {
      const next = readGamepadGesture(navigator.getGamepads());
      if (now - previousUpdate >= 80 || next.complete) {
        setGesture(next);
        previousUpdate = now;
      }
      if (next.complete) {
        problem.solve();
        return;
      }
      frame = window.requestAnimationFrame(poll);
    };
    frame = window.requestAnimationFrame(poll);
    const cleanup = () => window.cancelAnimationFrame(frame);
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [problem.solve, props.signal]);

  return (
    <div className="puzzle puzzle--centered">
      <div className="gamepad-meter" aria-hidden="true">
        <span style={{ width: `${Math.min(100, gesture.pressed * 40)}%` }} />
        <span style={{ width: `${Math.round(gesture.axis * 100)}%` }} />
      </div>
      <p className="measurement">
        {stageText(props.locale, locale.pressed)} {gesture.pressed} ·{" "}
        {stageText(props.locale, locale.axis)} {gesture.axis.toFixed(2)}
      </p>
      <p className="interaction-status" role="status">
        {stageText(props.locale, locale.gestureHint)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SportsEsportsOutlined,
      color: "#fb7185",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "getGamepads" in navigator ? "available" : "unsupported",
    ),
  Component: S200Stage,
});
