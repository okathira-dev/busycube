import "./styles.css";
import StopCircleOutlined from "@mui/icons-material/StopCircleOutlined";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
interface Attempt {
  dispose(): void;
}
const duration = 62_000;
const observationGap = 2_500;

/**
 * S-330
 * 目的: 画面表示中に実Screen Wake Lockを取得して保持し、待機リングを満たす。
 * 最初の一手: 日差しの箱を押し、保持中の点灯と待機リングを画面を開いたまま待つ。途中でやめる場合は解除アイコンを押す。
 * 箱ごとの解法:
 * - B03「日差し」: 箱からnavigator.wakeLock.request('screen')を実行する。取得完了からdocument.visibilityState === 'visible'かつ同じsentinel.released === falseを連続観測して62,000ms保持すると開く。取得だけの旧B01は移行しない。非表示/解除で待機を失い、再試行は箱から行う。1秒間隔の観測が2.5秒超空いた場合や時計異常は基準をリセットし、中断時間だけで成功にしない。
 * 使用API: Screen Wake Lock / WakeLockSentinel.released/release、Page Visibility、performance.now、待機用timer。IdleDetectorは使わずS-830とは独立する。
 * 権限・privacy: screen wake lockだけを利用し、点灯状態と経過表示をmemoryに持つ。操作履歴・端末情報を保存/送信しない。手動解除/離脱/abort/達成で解放し、遅い取得結果も解放する。
 * 対応環境: secure contextのScreen Wake Lock対応browser。OSの省電力等で解放され得る。API上の保持はOS画面の常時点灯を物理的に保証するものではない。
 */
function S330Stage(props: Props) {
  const [status, setStatus] = useState<CommonStatus | "holding">("idle");
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fraction, setFraction] = useState(0);
  const active = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const solved = useRef(false);
  const box = useRef(props.boxes.B03);
  box.current = props.boxes.B03;
  const release = useCallback(() => {
    attempt.current?.dispose();
    if (active.current) {
      setStatus("released");
      setFraction(solved.current ? 1 : 0);
    }
  }, []);
  useEffect(() => {
    active.current = !props.signal.aborted;
    const visibility = () => {
      if (document.visibilityState !== "visible") release();
    };
    const dispose = () => {
      document.removeEventListener("visibilitychange", visibility);
      active.current = false;
      attempt.current?.dispose();
    };
    document.addEventListener("visibilitychange", visibility);
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal, release]);

  const start = async () => {
    if (
      !active.current ||
      props.signal.aborted ||
      attempt.current ||
      solved.current
    )
      return;
    if (!navigator.wakeLock?.request) {
      setStatus("unavailable");
      return;
    }
    if (document.visibilityState !== "visible") {
      setStatus("waiting");
      return;
    }
    let sentinel: WakeLockSentinel | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    const releaseSentinel = () => {
      if (sentinel && !sentinel.released)
        void sentinel.release().catch(() => undefined);
    };
    const lost = () => {
      if (!valid() || sentinel?.released !== true) return;
      current.dispose();
      setFraction(0);
      setStatus("released");
    };
    const current: Attempt = {
      dispose: () => {
        if (stopped) return;
        stopped = true;
        if (timer !== undefined) clearInterval(timer);
        sentinel?.removeEventListener("release", lost);
        releaseSentinel();
        if (attempt.current === current) attempt.current = null;
        if (active.current) {
          setHolding(false);
          setBusy(false);
        }
      },
    };
    const valid = () =>
      active.current &&
      !props.signal.aborted &&
      !stopped &&
      attempt.current === current;
    attempt.current = current;
    setBusy(true);
    setFraction(0);
    setStatus("waiting");
    try {
      sentinel = await navigator.wakeLock.request("screen");
      if (!valid()) {
        releaseSentinel();
        return;
      }
      if (
        sentinel.released !== false ||
        sentinel.type !== "screen" ||
        document.visibilityState !== "visible"
      ) {
        current.dispose();
        setStatus("released");
        return;
      }
      sentinel.addEventListener("release", lost);
      setHolding(true);
      setStatus("holding");
      let started = performance.now();
      let previous = started;
      timer = setInterval(() => {
        if (!valid()) return;
        if (
          document.visibilityState !== "visible" ||
          sentinel?.released !== false
        ) {
          current.dispose();
          setFraction(0);
          setStatus("released");
          return;
        }
        const now = performance.now();
        if (
          !Number.isFinite(now) ||
          !Number.isFinite(previous) ||
          now < previous ||
          now - previous > observationGap
        ) {
          started = now;
          previous = now;
          setFraction(0);
          return;
        }
        previous = now;
        const elapsed = now - started;
        setFraction(Math.min(1, elapsed / duration));
        if (elapsed >= duration) {
          solved.current = true;
          box.current.solve();
          current.dispose();
          setStatus("success");
        }
      }, 1_000);
    } catch (error) {
      if (!valid()) return;
      current.dispose();
      setStatus(
        error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "SecurityError")
          ? "denied"
          : "error",
      );
    }
  };

  return (
    <div className="puzzle puzzle--centered s330-puzzle" data-holding={holding}>
      <svg
        className="s330-wait"
        viewBox="0 0 100 100"
        role="img"
        aria-label={stageText(props.locale, locale.waiting)}
      >
        <circle className="s330-track" cx="50" cy="50" r="42" />
        <circle
          className="s330-progress"
          cx="50"
          cy="50"
          r="42"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 * (1 - fraction)}
        />
        <circle className="s330-light" cx="50" cy="50" r="22" />
      </svg>
      <StageProblemGiftBox
        box={props.boxes.B03}
        locale={props.locale}
        onClick={() => void start()}
      />
      {busy ? (
        <button
          type="button"
          className="stage-action s330-release"
          onClick={release}
          aria-label={stageText(props.locale, locale.release)}
        >
          <StopCircleOutlined aria-hidden="true" />
        </button>
      ) : null}
      <p role="status" className="interaction-status">
        {status === "holding"
          ? stageText(props.locale, locale.holding)
          : statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: WbSunnyOutlined,
      color: "#facc15",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "wakeLock" in navigator ? "available" : "unsupported",
    ),
  Component: S330Stage,
});
