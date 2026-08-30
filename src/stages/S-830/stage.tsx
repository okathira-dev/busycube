import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
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
 * S-830
 *
 * 目的: OSとbrowserが共同で判断するidle/unlocked状態とscreen locked状態をIdleDetectorから別々に観測する。
 * 最初の一手: 「見守りを始める」を押してIdle Detectionを許可し、端末へ触れず60秒待つ。もう一方はOSの実screen lockを行う。
 * 箱ごとの解法:
 * - B01「離席の箱」: threshold 60,000 msのdetectorで`userState === "idle"`かつ`screenState === "unlocked"`をchange後またはstart直後に観測すると開く。
 * - B02「画面ロックの箱」: 同じdetectorの`screenState`が厳密に`locked`なら開く。二状態の観測順序は問わない。
 * 使用API: Idle Detection APIの`requestPermission()`、IdleDetector start/state/change、AbortController。
 * 権限・privacy: Idle Detection permissionは明示button後に要求し、現在のcoarse stateだけを判定する。離席時刻・入力内容・端末IDを保存・送信しない。
 * 対応環境: secure contextでIdleDetectorとOS screen lock stateを公開し、permission policyを満たすbrowser/OS。
 */
function S830Stage(props: Props) {
  const idleProblem = props.boxes[manifest.box.B01];
  const lockProblem = props.boxes[manifest.box.B02];
  const controllerRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const stop = () => controllerRef.current?.abort();
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  const start = async () => {
    const Idle = window.IdleDetector;
    if (!Idle) return;
    controllerRef.current?.abort();
    setStatus(stageText(props.locale, locale.requesting));
    try {
      const permission = await Idle.requestPermission();
      if (permission !== "granted") {
        setStatus(stageText(props.locale, locale.denied));
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      const detector = new Idle();
      const observe = () => {
        if (controller.signal.aborted) return;
        if (detector.screenState === "locked") {
          lockProblem.solve();
          setStatus(stageText(props.locale, locale.screenLocked));
          return;
        }
        if (
          detector.userState === "idle" &&
          detector.screenState === "unlocked"
        ) {
          idleProblem.solve();
          setStatus(stageText(props.locale, locale.idleUnlocked));
        }
      };
      detector.addEventListener("change", observe);
      controller.signal.addEventListener(
        "abort",
        () => detector.removeEventListener("change", observe),
        { once: true },
      );
      if (!controller.signal.aborted) {
        setStatus(stageText(props.locale, locale.watching));
      }
      await detector.start({ threshold: 60_000, signal: controller.signal });
      observe();
    } catch (error: unknown) {
      if ((error as DOMException).name !== "AbortError") {
        setStatus(stageText(props.locale, locale.failed));
      }
    }
  };

  return (
    <div className="puzzle puzzle--centered s830-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={idleProblem} locale={props.locale} />
        <StageProblemGiftBox box={lockProblem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.intro)}</p>
      <button
        type="button"
        className="stage-action"
        onClick={() => void start()}
      >
        {stageText(props.locale, locale.start)}
      </button>
      <output className="interaction-status" aria-live="polite">
        {status}
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: HourglassEmptyOutlined,
      color: "#94a3b8",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: LockOutlined,
      color: "#334155",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && window.IdleDetector
        ? "permission-required"
        : "unsupported",
    ),
  Component: S830Stage,
});
