import "./styles.css";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import ViewInArOutlined from "@mui/icons-material/ViewInArOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type Mode = "immersive-vr" | "immersive-ar";
type View = ReturnType<typeof import("./xrRenderer").createXrView>;
interface Attempt {
  cancelled: boolean;
  ended: boolean;
  session?: XRSession;
  view?: View;
  ending?: Promise<void>;
  detach?: () => void;
}
function closeAttempt(attempt: Attempt) {
  attempt.cancelled = true;
  attempt.detach?.();
  attempt.detach = undefined;
  attempt.view?.dispose();
  if (attempt.session && !attempt.ended && !attempt.ending) {
    attempt.ending = attempt.session.end().catch(() => undefined);
  }
  return attempt.ending ?? Promise.resolve();
}

/**
 * S-730
 *
 * 目的: 実immersive WebXR空間で、リボンと蓋のある箱へ光線を当てて実選択する。
 * 最初の一手: AR/VR機器を接続し、XRアイコンを押してbrowserの開始UIを完了する。
 * 箱ごとの解法:
 * - B02「点線の四角」: XRアイコンから入った空間で、箱へ入力機器の光線を当てて選択する。実sessionのinputSourcesに属するsourceからのtrusted select eventで、event.frameのtargetRaySpace poseの光線が表示中の箱のmeshへ交差した時だけ開く。viewer poseの取得やhoverだけでは開かない。
 * 使用API: WebXR support/requestSession（VR優先、AR対応時はAR）、local reference space、実viewer/input pose、session select、Three.jsのWebGLRenderer/Group/Raycaster。箱は最初の有効なviewer poseから1.5m前方へ配置して固定し、各frameの入力光線を表示・交差時に点灯、実選択後に蓋を開く。
 * 権限・privacy: XR要求はアイコンの明示操作からだけ行う。pose/rayは現在frameの配置/交差表示だけに使い、部屋映像・座標履歴・機器情報を保存・送信しない。
 * 対応環境: secure contextでimmersive-vrまたはimmersive-ar、local space、WebGLと実AR/VR入力機器を提供するbrowser。
 */
function S730Stage(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const alive = useRef(false);
  const attempt = useRef<Attempt | null>(null);
  const mode = useRef<Mode | null>(null);
  const preparing = useRef(0);
  const starting = useRef(false);
  const closing = useRef(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.preparing),
  );
  const copy = useRef(props.locale);
  copy.current = props.locale;
  const box = useRef(props.boxes[manifest.box.B02]);
  box.current = props.boxes[manifest.box.B02];
  const stop = useCallback(() => {
    const prior = attempt.current;
    attempt.current = null;
    return prior ? closeAttempt(prior) : Promise.resolve();
  }, []);
  useEffect(() => {
    alive.current = !props.signal.aborted;
    const dispose = () => {
      alive.current = false;
      void stop();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal, stop]);
  const prepare = useCallback(async () => {
    if (!alive.current || attempt.current) return;
    const revision = ++preparing.current;
    setChecking(true);
    setStatus(stageText(copy.current, locale.preparing));
    try {
      const xr = navigator.xr;
      const supported =
        isSecureContext && xr
          ? (await xr.isSessionSupported("immersive-vr"))
            ? "immersive-vr"
            : (await xr.isSessionSupported("immersive-ar"))
              ? "immersive-ar"
              : null
          : null;
      if (
        !alive.current ||
        props.signal.aborted ||
        revision !== preparing.current ||
        attempt.current
      )
        return;
      mode.current = supported;
      setStatus(
        stageText(copy.current, supported ? locale.idle : locale.unsupported),
      );
      if (supported) void import("./xrRenderer").catch(() => {});
    } catch {
      if (alive.current && revision === preparing.current) {
        mode.current = null;
        setStatus(stageText(copy.current, locale.unsupported));
      }
    } finally {
      if (alive.current && revision === preparing.current) setChecking(false);
    }
  }, [props.signal]);
  useEffect(() => {
    void prepare();
    const change = () => void prepare();
    navigator.xr?.addEventListener("devicechange", change);
    return () => navigator.xr?.removeEventListener("devicechange", change);
  }, [prepare]);
  const start = async () => {
    if (
      !alive.current ||
      props.signal.aborted ||
      starting.current ||
      closing.current ||
      attempt.current
    )
      return;
    const xr = navigator.xr;
    const target = canvas.current;
    const chosen = mode.current;
    if (!xr || !target || !chosen) {
      void prepare();
      return;
    }
    const current: Attempt = { cancelled: false, ended: false };
    attempt.current = current;
    starting.current = true;
    setBusy(true);
    setStatus(stageText(copy.current, locale.starting));
    const valid = () =>
      alive.current &&
      !props.signal.aborted &&
      !current.cancelled &&
      attempt.current === current;
    try {
      // requestSessionは明示操作中に呼び、importやsupport queryのawaitを先に挟まない。
      current.session = await xr.requestSession(chosen, {
        requiredFeatures: ["local"],
      });
      if (!valid()) {
        await closeAttempt(current);
        return;
      }
      const session = current.session;
      const onEnd = () => {
        current.ended = true;
        const wasCurrent = attempt.current === current;
        if (wasCurrent) attempt.current = null;
        void closeAttempt(current);
        if (alive.current && wasCurrent) {
          setPresenting(false);
          setStatus(stageText(copy.current, locale.ended));
        }
      };
      session.addEventListener("end", onEnd, { once: true });
      current.detach = () => session.removeEventListener("end", onEnd);
      setPresenting(true);
      const rendering = await import("./xrRenderer");
      if (!valid()) {
        await closeAttempt(current);
        return;
      }
      current.view = rendering.createXrView(
        session,
        target,
        chosen === "immersive-ar",
        () => {
          if (!valid()) return;
          box.current.solve();
          setStatus(stageText(copy.current, locale.selected));
        },
        () => {
          if (!valid()) return;
          attempt.current = null;
          void closeAttempt(current);
          setPresenting(false);
          setStatus(stageText(copy.current, locale.failed));
        },
      );
      await current.view.start();
      if (!valid()) {
        await closeAttempt(current);
        return;
      }
      setStatus(stageText(copy.current, locale.active));
    } catch (error) {
      const wasCurrent = attempt.current === current;
      if (wasCurrent) attempt.current = null;
      await closeAttempt(current);
      if (alive.current && wasCurrent) {
        setPresenting(false);
        const reason =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "AbortError")
            ? locale.cancelled
            : error instanceof DOMException &&
                error.name === "NotSupportedError"
              ? locale.unsupported
              : locale.failed;
        setStatus(stageText(copy.current, reason));
      }
    } finally {
      starting.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const end = async () => {
    if (closing.current) return;
    closing.current = true;
    setStopping(true);
    setPresenting(false);
    await stop();
    closing.current = false;
    if (alive.current) {
      setStopping(false);
      setStatus(stageText(copy.current, locale.ended));
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox
        box={props.boxes[manifest.box.B02]}
        locale={props.locale}
      />
      <button
        type="button"
        className="stage-action s730-enter"
        aria-label={stageText(props.locale, locale.start)}
        title={stageText(props.locale, locale.start)}
        disabled={checking || busy || stopping || presenting}
        onClick={() => void start()}
      >
        <ViewInArOutlined aria-hidden="true" fontSize="large" />
      </button>
      <canvas
        ref={canvas}
        className="s730-canvas"
        hidden={!presenting}
        aria-label={stageText(props.locale, locale.canvas)}
      />
      <button
        type="button"
        className="stage-action"
        disabled={(!presenting && !busy) || stopping}
        onClick={() => void end()}
      >
        {stageText(props.locale, locale.end)}
      </button>
      <p className="stage-status" role="status">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: SelectAllOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "xr" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S730Stage,
});
