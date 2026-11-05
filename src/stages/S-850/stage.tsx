import "./styles.css";
import PictureInPictureAltOutlined from "@mui/icons-material/PictureInPictureAltOutlined";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { GiftBox, StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const target = { width: 360, height: 300 };
/**
 * S-850
 * 目的: 実Document PiPへ逃げた箱の幅と高さを、元ページに残る通常の箱のシルエットへ合わせる。
 * 最初の一手: 箱を押し、別窓へ移った箱と残った影を見比べる。
 * 箱ごとの解法:
 * - B02「小さな窓が重なる画面」: 箱から開いた実PiP窓をリサイズする。箱の横/縦倍率は実innerWidth/360とinnerHeight/300。初期寸法から変わったtrusted resizeを受け、両寸法が目標±6 CSS pxに同時一致したら開く。比率だけ、小窓起動、箱の再clickでは開かない。
 * 使用API: Document Picture-in-Picture requestWindow/window、別documentへのReact portal、Window resize/pagehide、実innerWidth/innerHeight。
 * 権限・privacy: 画面captureやcameraは使わず、表示中のWindowと寸法のみをmemoryに保持する。
 * 対応環境: user activationからDocument PiPを開き、360×300 CSS pxへリサイズできるdesktop browser。旧B01は小窓clickの履歴に保持し、新サイズ合わせへコピーしない。
 */
function S850Stage(props: Props) {
  const problem = props.boxes.B02;
  const visit = useRef({ alive: false, generation: 0, opening: false });
  const current = useRef<Window | null>(null);
  const detach = useRef<() => void>(() => {});
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [pip, setPip] = useState<Window | null>(null);
  const [size, setSize] = useState({ width: 480, height: 240 });
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    const state = visit.current;
    state.alive = true;
    const stop = () => {
      state.alive = false;
      state.generation++;
      state.opening = false;
      detach.current();
      const window = current.current;
      current.current = null;
      window?.close();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) stop();
    return () => {
      stop();
      props.signal.removeEventListener("abort", stop);
    };
  }, [props.signal]);
  const open = async () => {
    const state = visit.current,
      api = window.documentPictureInPicture;
    if (
      !state.alive ||
      props.signal.aborted ||
      state.opening ||
      current.current
    )
      return;
    if (!api) {
      setStatus("unavailable");
      return;
    }
    const generation = ++state.generation;
    state.opening = true;
    try {
      const floating = await api.requestWindow({ width: 480, height: 240 });
      if (
        !state.alive ||
        props.signal.aborted ||
        generation !== state.generation
      ) {
        floating.close();
        return;
      }
      current.current = floating;
      floating.document.title = stageText(props.locale, locale.floatingTitle);
      floating.document.documentElement.lang = props.locale;
      floating.document.documentElement.style.fontSize = getComputedStyle(
        document.documentElement,
      ).fontSize;
      for (const style of document.head.querySelectorAll(
        "link[rel='stylesheet'], style",
      ))
        floating.document.head.append(style.cloneNode(true));
      const initial = {
        width: floating.innerWidth,
        height: floating.innerHeight,
      };
      setSize(initial);
      setPip(floating);
      setStatus("waiting");
      const valid = () =>
        state.alive &&
        !props.signal.aborted &&
        generation === state.generation &&
        current.current === floating &&
        api.window === floating &&
        !floating.closed;
      const resize = (event: Event) => {
        if (!valid() || !event.isTrusted) return;
        const width = floating.innerWidth,
          height = floating.innerHeight;
        setSize({ width, height });
        if (
          (width !== initial.width || height !== initial.height) &&
          Math.abs(width - target.width) <= 6 &&
          Math.abs(height - target.height) <= 6
        ) {
          boxes.current.B02.solve();
          setStatus("success");
        }
      };
      const close = () => {
        if (current.current !== floating) return;
        detach.current();
        current.current = null;
        if (state.alive) {
          setPip(null);
          setStatus("idle");
        }
      };
      floating.addEventListener("resize", resize);
      floating.addEventListener("pagehide", close, { once: true });
      detach.current = () => {
        floating.removeEventListener("resize", resize);
        floating.removeEventListener("pagehide", close);
      };
    } catch {
      if (state.alive && generation === state.generation)
        setStatus("unavailable");
    } finally {
      if (generation === state.generation) state.opening = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered s850-stage">
      {pip
        ? createPortal(
            <main className="s850-floating-root">
              <div
                className="s850-scaler"
                style={{
                  transform: `scale(${size.width / target.width}, ${size.height / target.height})`,
                }}
              >
                <StageProblemGiftBox box={problem} locale={props.locale} />
              </div>
            </main>,
            pip.document.body,
          )
        : null}
      <div className="s850-reference">
        {pip ? (
          <>
            <div className="s850-shadow" aria-hidden="true">
              <GiftBox state="ribboned" color="#60a5fa" label="" decorative />
            </div>
            <PictureInPictureAltOutlined
              aria-label={stageText(props.locale, locale.moved)}
            />
          </>
        ) : (
          <StageProblemGiftBox
            box={problem}
            locale={props.locale}
            onClick={() => void open()}
          />
        )}
      </div>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B02: {
      icon: PictureInPictureAltOutlined,
      color: "#60a5fa",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      window.documentPictureInPicture ? "available" : "unsupported",
    ),
  Component: S850Stage,
});
