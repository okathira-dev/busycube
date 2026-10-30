import "./styles.css";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
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
interface Runtime {
  controller: AbortController;
  dispose(): void;
}
const threshold = 62_000;

/**
 * S-830
 *
 * 目的: 端末全体の実IdleDetectorが示す離席・未ロックと画面ロックを別々の箱へ対応させる。
 * 最初の一手: 砂時計または錠前の箱を押して許可し、点灯した二箱と待機リングを見る。
 * 箱ごとの解法:
 * - B03「砂時計」: 箱から観測を開始し、端末への操作をやめる。threshold 62,000msの実IdleDetectorでuserState=idleかつscreenState=unlockedを初期状態またはtrusted changeで観測すると開く。
 * - B02「錠前」: 同じ観測中に端末の画面を実際にロックする。実screenState=lockedの初期状態またはtrusted changeで開く。62秒の待機や砂時計箱の先行達成は要求しない。
 * 使用API: IdleDetector.requestPermission/start/state/change、AbortController。リングは開始/既知のactive状態からの推定で、正確な端末の最終操作時刻ではない。推定は未達中95%までに留め、完了だけで達成しない。ゲームのWake Lockは取得しない。
 * 権限・privacy: どちらかの箱の明示操作で権限を要求し、start成功後の実状態だけを判定する。現在状態とゲームの達成boolean/表示用基準時刻だけをmemoryに持ち、離席時刻・入力内容・端末IDを保存・送信しない。
 * 対応環境: secure contextでIdleDetectorとOSのscreen lock stateを提供するbrowser/OS。消灯・スリープ・自動ロックとの差は端末依存で、経過時間やpage visibilityを代替観測にしない。
 */
function S830Stage(props: Props) {
  const [status, setStatus] = useState<CommonStatus>("idle");
  const [observing, setObserving] = useState(false);
  const [estimate, setEstimate] = useState(0);
  const active = useRef(false);
  const runtime = useRef<Runtime | null>(null);
  const opened = useRef({ idle: false, lock: false });
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const stop = useCallback(() => runtime.current?.dispose(), []);
  useEffect(() => {
    active.current = !props.signal.aborted;
    const dispose = () => {
      active.current = false;
      stop();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal, stop]);
  const start = async () => {
    if (!active.current || props.signal.aborted || runtime.current) return;
    const Idle = window.IdleDetector;
    if (!Idle) {
      setStatus("unavailable");
      return;
    }
    const controller = new AbortController();
    let detector: IdleDetector | undefined;
    let listener: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const current: Runtime = {
      controller,
      dispose: () => {
        if (detector && listener)
          detector.removeEventListener("change", listener);
        if (timer !== undefined) clearInterval(timer);
        controller.abort();
        if (runtime.current === current) runtime.current = null;
      },
    };
    runtime.current = current;
    const valid = () =>
      active.current &&
      !props.signal.aborted &&
      !controller.signal.aborted &&
      runtime.current === current;
    setStatus("waiting");
    try {
      const permission = await Idle.requestPermission();
      if (!valid()) {
        current.dispose();
        return;
      }
      if (permission !== "granted") {
        current.dispose();
        setStatus("denied");
        return;
      }
      detector = new Idle();
      const source = detector;
      let ready = false;
      let since = performance.now();
      const observe = () => {
        if (!valid() || !ready) return;
        if (source.screenState === "locked" && !opened.current.lock) {
          opened.current.lock = true;
          boxes.current[manifest.box.B02].solve();
          setStatus("matched");
        }
        if (
          source.userState === "idle" &&
          source.screenState === "unlocked" &&
          !opened.current.idle
        ) {
          opened.current.idle = true;
          boxes.current[manifest.box.B03].solve();
          setEstimate(1);
          if (timer !== undefined) clearInterval(timer);
          timer = undefined;
          setStatus("matched");
        }
        if (
          !opened.current.idle &&
          (source.userState === "active" || source.screenState === "locked")
        ) {
          since = performance.now();
          setEstimate(0);
        }
        if (opened.current.idle && opened.current.lock) {
          current.dispose();
          setObserving(false);
          setStatus("success");
        }
      };
      listener = (event?: Event) => {
        if (event?.isTrusted) observe();
      };
      source.addEventListener("change", listener);
      await source.start({ threshold, signal: controller.signal });
      if (!valid()) {
        current.dispose();
        return;
      }
      ready = true;
      since = performance.now();
      setObserving(true);
      setStatus("running");
      observe();
      if (valid() && !opened.current.idle)
        timer = setInterval(() => {
          if (valid())
            setEstimate(
              Math.min(
                0.95,
                Math.max(0, (performance.now() - since) / threshold),
              ),
            );
        }, 1000);
    } catch (error) {
      const report = valid();
      current.dispose();
      if (!report) return;
      setObserving(false);
      const reason: CommonStatus =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError")
          ? "denied"
          : error instanceof DOMException && error.name === "NotSupportedError"
            ? "unavailable"
            : "error";
      setStatus(reason);
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row s830-boxes" data-observing={observing}>
        <StageProblemGiftBox
          box={props.boxes[manifest.box.B03]}
          locale={props.locale}
          onClick={() => void start()}
        />
        <StageProblemGiftBox
          box={props.boxes[manifest.box.B02]}
          locale={props.locale}
          onClick={() => void start()}
        />
      </div>
      <svg
        className="s830-wait"
        viewBox="0 0 120 120"
        role="img"
        aria-label={stageText(props.locale, locale.estimate)}
        data-observing={observing}
      >
        <circle className="s830-track" cx="60" cy="60" r="48" />
        <circle
          className="s830-estimate"
          cx="60"
          cy="60"
          r="48"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 * (1 - estimate)}
        />
      </svg>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: HourglassEmptyOutlined,
      color: "#94a3b8",
      label: locale.B03,
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
