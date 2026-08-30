import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-330
 *
 * 目的: screen wake lockを取得し、page非表示等によるbrowser側releaseの後、visible復帰時に新しいlockを再取得する。
 * 最初の一手: pageがvisibleな状態で「灯りを保つ」を押し、取得後に別tab/appへ移ってlockをreleaseさせてから戻る。
 * 箱ごとの解法:
 * - B01「灯りを保つ箱」: buttonから`navigator.wakeLock.request("screen")`が成功し、sentinelを保持できると開く。
 * - B02「灯りを戻す箱」: 取得済みsentinelの`release` eventを一度受けた後、pageがvisibleへ戻った時のscreen wake lock再要求が成功すると開く。
 * 使用API: Screen Wake Lock APIのrequest/WakeLockSentinel release event、Page Visibility API。
 * 権限・privacy: screen wake lock以外の権限・dataを使用せず、取得/release状態はmemory内でだけ保持して保存・送信しない。
 * 対応環境: secure contextでScreen Wake Lock APIを実装し、visibility変化時にlockをrelease・復帰時に再取得できるbrowser/OS。
 */
function S330Stage(props: Props) {
  const acquireProblem = props.boxes[manifest.box.B01];
  const returnProblem = props.boxes[manifest.box.B02];
  const solveAcquire = acquireProblem.solve;
  const solveReturn = returnProblem.solve;
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const releasedOnce = useRef(false);
  const activeRef = useRef(true);
  const [status, setStatus] = useState("idle");

  const acquire = useCallback(
    async (returning: boolean) => {
      if (document.visibilityState !== "visible" || sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (!activeRef.current) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setStatus(returning ? "reacquired" : "holding");
        (returning ? solveReturn : solveAcquire)();
        sentinel.addEventListener(
          "release",
          () => {
            sentinelRef.current = null;
            if (!activeRef.current) return;
            releasedOnce.current = true;
            setStatus("released");
          },
          { once: true },
        );
      } catch {
        if (activeRef.current) setStatus("unavailable");
      }
    },
    [solveAcquire, solveReturn],
  );

  useEffect(() => {
    activeRef.current = true;
    const visibility = () => {
      if (document.visibilityState === "visible" && releasedOnce.current) {
        void acquire(true);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    const cleanup = () => {
      activeRef.current = false;
      document.removeEventListener("visibilitychange", visibility);
      if (sentinelRef.current) void sentinelRef.current.release();
      sentinelRef.current = null;
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [acquire, props.signal]);

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={acquireProblem} locale={props.locale} />
        <StageProblemGiftBox box={returnProblem} locale={props.locale} />
      </div>
      <div
        className="wake-light"
        data-active={status === "holding" || status === "reacquired"}
        aria-hidden="true"
      />
      <button
        type="button"
        className="stage-action"
        onClick={() => void acquire(false)}
      >
        {stageText(props.locale, locale.keepAwake)}
      </button>
      <p className="measurement">
        {stageText(props.locale, locale.returnAfterAcquire)}
      </p>
      <p className="interaction-status" role="status">
        {stageText(
          props.locale,
          status === "holding"
            ? locale.holding
            : status === "reacquired"
              ? locale.reacquired
              : status === "released"
                ? locale.released
                : locale.unavailable,
        )}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: WbSunnyOutlined,
      color: "#facc15",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: KeyboardReturnOutlined,
      color: "#fde68a",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "wakeLock" in navigator ? "available" : "unsupported",
    ),
  Component: S330Stage,
});
