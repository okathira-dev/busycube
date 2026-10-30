import "./styles.css";
import MovieCreationOutlined from "@mui/icons-material/MovieCreationOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { hasS900CorrectOrder, type S900ReelId } from "./functions";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { reelUrl, splice } from "./splice";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const ids: S900ReelId[] = ["A", "B", "C", "D"];
const captions = new URL(
  "../../fixtures/s900/assets/empty.vtt",
  import.meta.url,
).href;
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % (i + 1);
    const left = result[i],
      right = result[j];
    if (left === undefined || right === undefined)
      throw new Error("Invalid shuffle");
    result[i] = right;
    result[j] = left;
  }
  return result;
}
/**
 * S-900
 * 目的: 球が装置を通って箱に入る四本の映像をつなぎ、実MediaSourceの動画を完成させる。
 * 最初の一手: シャッフルされた各リールを個別プレビューし、切れ目の球/装置の動きを見比べる。
 * 箱ごとの解法:
 * - B01「左右の矢印」: 四本を映像のつながる順に選び、再生iconで映写機へ渡す。実SourceBufferへlead-inと選択四本をtimestampOffset付きでappendし、正しい順の組立完了後、同じvideoが実末尾に達してtrusted endedを返すと開く。誤順序でもその順に再生し、事前の正誤文章は出さない。
 * 使用API: MediaSource/SourceBuffer segments/timestampOffset/appendBuffer/updateend/endOfStream、native video個別再生/ended、fetch/AbortSignal、Blob URL。
 * 権限・privacy: 合成した同梱映像だけを取得し、capture・録音・保存・外部送信しない。
 * 対応環境: VP8 WebMをMSEで再生できるbrowser。正答順の番号やA/B/C/Dは画面へ出さず、リール記号と表示順は別々にshuffleする。
 */
function S900Stage(props: Props) {
  const [reels] = useState(() => {
    const order = shuffle(ids);
    if (hasS900CorrectOrder(order)) order.reverse();
    const symbols = shuffle(["●", "◆", "▲", "■"]);
    return order.map((id, i) => ({ id, symbol: symbols[i] }));
  });
  const [order, setOrder] = useState<S900ReelId[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const active = useRef<{
    controller: AbortController;
    media: Awaited<ReturnType<typeof splice>> | null;
    order: S900ReelId[];
    ready: boolean;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const alive = useRef(false);
  const stop = useCallback(() => {
    const old = active.current;
    active.current = null;
    old?.controller.abort();
    old?.media?.dispose();
    for (const element of root.current?.querySelectorAll("video") ?? [])
      element.pause();
    if (video.current) {
      video.current.removeAttribute("src");
      video.current.load();
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const cleanup = () => {
      alive.current = false;
      stop();
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    if (props.signal.aborted) cleanup();
    return () => {
      cleanup();
      props.signal.removeEventListener("abort", cleanup);
    };
  }, [props.signal, stop]);
  const supported =
    "MediaSource" in window &&
    MediaSource.isTypeSupported('video/webm; codecs="vp8"');
  const assemble = async () => {
    if (!alive.current || props.signal.aborted || order.length !== 4) return;
    stop();
    setUrl(null);
    setStatus("waiting");
    const attempt = {
      controller: new AbortController(),
      media: null as Awaited<ReturnType<typeof splice>> | null,
      order: [...order],
      ready: false,
    };
    active.current = attempt;
    const valid = () =>
      alive.current &&
      !props.signal.aborted &&
      active.current === attempt &&
      !attempt.controller.signal.aborted;
    try {
      const media = await splice(attempt.order, attempt.controller.signal);
      if (!valid()) {
        media.dispose();
        return;
      }
      attempt.media = media;
      setUrl(media.url);
      await media.ready;
      if (!valid()) return;
      attempt.ready = true;
      setStatus("created");
      const element = video.current;
      try {
        await element?.play();
      } catch {
        /* Native controls remain available if autoplay is denied. */
      }
      if (!valid()) element?.pause();
    } catch {
      if (valid()) {
        attempt.controller.abort();
        active.current = null;
        setUrl(null);
        setStatus("unavailable");
      }
    }
  };
  const symbol = (id: S900ReelId) =>
    reels.find((reel) => reel.id === id)?.symbol;
  return (
    <div ref={root} className="puzzle s900-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={props.boxes.B01} locale={props.locale} />
      </div>
      <div className="s900-reels">
        {reels.map((reel) => (
          <div key={reel.id} className="s900-reel">
            <video
              controls
              muted
              playsInline
              preload="metadata"
              src={reelUrl(reel.id)}
              aria-label={`${stageText(props.locale, locale.preview)} ${reel.symbol}`}
            >
              <track
                kind="captions"
                src={captions}
                srcLang="en"
                label="Captions"
              />
            </video>
            <button
              type="button"
              className="stage-action"
              aria-label={`${stageText(props.locale, locale.add)} ${reel.symbol}`}
              disabled={!supported || order.includes(reel.id)}
              onClick={() => setOrder((value) => [...value, reel.id])}
            >
              <MovieCreationOutlined aria-hidden="true" />
              <span>{reel.symbol}</span>
            </button>
          </div>
        ))}
      </div>
      <ol
        className="s900-slots"
        aria-label={stageText(props.locale, locale.order)}
      >
        {[0, 1, 2, 3].map((position) => (
          <li key={position}>
            {order[position] ? symbol(order[position]) : "·"}
          </li>
        ))}
      </ol>
      <div className="s900-actions">
        <button
          className="stage-action"
          type="button"
          aria-label={stageText(props.locale, locale.assemble)}
          disabled={!supported || order.length !== 4 || status === "waiting"}
          onClick={() => void assemble()}
        >
          <PlayArrowOutlined aria-hidden="true" />
        </button>
        <button
          className="stage-action"
          type="button"
          aria-label={stageText(props.locale, locale.reset)}
          onClick={() => {
            stop();
            setOrder([]);
            setUrl(null);
            setStatus("idle");
          }}
        >
          <RestartAltOutlined aria-hidden="true" />
        </button>
      </div>
      {url ? (
        <video
          ref={video}
          className="s900-video"
          controls
          muted
          playsInline
          src={url}
          onEnded={(event) => {
            const attempt = active.current,
              element = event.currentTarget;
            if (
              event.isTrusted &&
              alive.current &&
              !props.signal.aborted &&
              attempt?.ready &&
              !attempt.controller.signal.aborted &&
              attempt.media?.url === url &&
              element === video.current &&
              element.ended &&
              Number.isFinite(element.duration) &&
              element.duration > 0 &&
              element.currentTime >= element.duration - 0.08 &&
              hasS900CorrectOrder(attempt.order)
            )
              props.boxes.B01.solve();
          }}
        >
          <track kind="captions" src={captions} srcLang="en" label="Captions" />
        </video>
      ) : null}
      <p role="status" className="interaction-status">
        {statusText(props.locale, supported ? status : "unavailable")}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: SwapHorizOutlined, color: "#f43f5e", label: locale.B01 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "MediaSource" in window &&
      MediaSource.isTypeSupported('video/webm; codecs="vp8"')
        ? "available"
        : "unsupported",
    ),
  Component: S900Stage,
});
