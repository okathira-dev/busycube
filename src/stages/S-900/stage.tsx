import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
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
import { hasS900CorrectOrder, type S900ReelId } from "./functions";
import { locale } from "./locale";

type SegmentManifest = {
  schemaVersion: number;
  mimeType: string;
  frameRate: number;
  width: number;
  height: number;
  leadIn: SegmentDescription;
  reels: Readonly<Record<S900ReelId, SegmentDescription>>;
};

type SegmentDescription = {
  file: keyof typeof segmentUrls;
  frames: number;
};

const manifestUrl = new URL(
  "../../fixtures/s900/assets/generation-manifest.json",
  import.meta.url,
).href;
const emptyCaptionsUrl = new URL(
  "../../fixtures/s900/assets/empty.vtt",
  import.meta.url,
).href;
const segmentUrls = {
  "lead.webm": new URL("../../fixtures/s900/assets/lead.webm", import.meta.url)
    .href,
  "a.webm": new URL("../../fixtures/s900/assets/a.webm", import.meta.url).href,
  "b.webm": new URL("../../fixtures/s900/assets/b.webm", import.meta.url).href,
  "c.webm": new URL("../../fixtures/s900/assets/c.webm", import.meta.url).href,
  "d.webm": new URL("../../fixtures/s900/assets/d.webm", import.meta.url).href,
} as const;
const reelIds: readonly S900ReelId[] = ["A", "B", "C", "D"];
const slots = [1, 2, 3, 4] as const;
const reelSequence: Readonly<Record<S900ReelId, number>> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
};

function appendSegment(
  sourceBuffer: SourceBuffer,
  bytes: ArrayBuffer,
  signal: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      sourceBuffer.removeEventListener("updateend", finish);
      signal.removeEventListener("abort", cancel);
      resolve();
    };
    const cancel = () => {
      sourceBuffer.removeEventListener("updateend", finish);
      reject(new DOMException("aborted", "AbortError"));
    };
    signal.addEventListener("abort", cancel, { once: true });
    sourceBuffer.addEventListener("updateend", finish, { once: true });
    try {
      sourceBuffer.appendBuffer(bytes);
    } catch (error) {
      sourceBuffer.removeEventListener("updateend", finish);
      signal.removeEventListener("abort", cancel);
      reject(error);
    }
  });
}

async function createSplicedVideo(
  order: readonly S900ReelId[],
  signal: AbortSignal,
) {
  const response = await fetch(manifestUrl, { signal });
  if (!response.ok) throw new Error("segment fixture unavailable");
  const manifest = (await response.json()) as SegmentManifest;
  if (
    manifest.schemaVersion !== 2 ||
    !Number.isFinite(manifest.frameRate) ||
    manifest.frameRate <= 0 ||
    manifest.width !== 640 ||
    manifest.height !== 360 ||
    !MediaSource.isTypeSupported(manifest.mimeType)
  ) {
    throw new Error("VP8 MediaSource unavailable");
  }
  const segments = [
    manifest.leadIn,
    ...order.map((reel) => manifest.reels[reel]),
  ];
  if (
    segments.some(
      (segment) =>
        !segment ||
        !(segment.file in segmentUrls) ||
        !Number.isInteger(segment.frames) ||
        segment.frames <= 0,
    )
  )
    throw new Error("invalid segment fixture manifest");
  const buffers = await Promise.all(
    segments.map(async (segment) => {
      const url = segmentUrls[segment.file];
      const asset = await fetch(url, { signal });
      if (!asset.ok) throw new Error("segment bytes unavailable");
      return { bytes: await asset.arrayBuffer(), frames: segment.frames };
    }),
  );
  const mediaSource = new MediaSource();
  const url = URL.createObjectURL(mediaSource);
  const ready = new Promise<void>((resolve, reject) => {
    mediaSource.addEventListener(
      "sourceopen",
      () => {
        void (async () => {
          const sourceBuffer = mediaSource.addSourceBuffer(manifest.mimeType);
          // Each reel is an independently encoded WebM. Append it at an
          // explicit timestamp so MSE, rather than a runtime transcoder,
          // creates the continuous playback timeline.
          sourceBuffer.mode = "segments";
          let timestamp = 0;
          for (const segment of buffers) {
            sourceBuffer.timestampOffset = timestamp;
            await appendSegment(sourceBuffer, segment.bytes, signal);
            timestamp += segment.frames / manifest.frameRate;
          }
          if (mediaSource.readyState === "open") mediaSource.endOfStream();
          resolve();
        })().catch((error: unknown) => {
          if (mediaSource.readyState === "open")
            mediaSource.endOfStream("decode");
          reject(error);
        });
      },
      { once: true },
    );
  });
  return { ready, url };
}

/**
 * S-900 — MediaSource映写機
 *
 * 目的: 選んだ順番の独立WebM segmentを実`SourceBuffer`へappendし、browserが連続再生できる一本の映像に組み立てる。
 * 最初の一手: リールをA、B、C、Dの順で押して4枠へ入れ、「映写機へ送る」を押す。
 * 箱ごとの解法:
 * - B01: 枠をA→B→C→Dで埋める。lead-inと4本のVP8 WebMをframe数由来の`timestampOffset`で順にappendした後、現れたnative videoを末尾まで再生し、trusted `ended` eventが発生すると開く。
 * 使用API: Media Source Extensionsの`MediaSource`、`SourceBuffer.mode`、`timestampOffset`、`appendBuffer()`、`updateend`、`endOfStream()`、HTMLVideoElementの`ended` event。
 * 権限・privacy: 権限・端末media・保存・外部送信は使わず、同梱したmanifestと5つの固定WebM assetだけをfetchする。
 * 対応環境: `video/webm; codecs="vp8"`をMediaSourceで扱え、native video controlsを提供するbrowser。
 */
function S900Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const videoRef = useRef<HTMLVideoElement>(null);
  const generationRef = useRef<AbortController | null>(null);
  const [order, setOrder] = useState<S900ReelId[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>();
  const [status, setStatus] = useState<
    "idle" | "waiting" | "ready" | "wrong" | "failed"
  >("idle");

  useEffect(() => {
    const stop = () => {
      generationRef.current?.abort();
      videoRef.current?.pause();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
      setVideoUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return undefined;
      });
    };
  }, [props.signal]);

  const assemble = () => {
    if (order.length !== reelIds.length) return;
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    setStatus("waiting");
    void createSplicedVideo(order, controller.signal)
      .then((media) => {
        setVideoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return media.url;
        });
        return media.ready;
      })
      .then(() => {
        if (!controller.signal.aborted)
          setStatus(hasS900CorrectOrder(order) ? "ready" : "wrong");
      })
      .catch((error: unknown) => {
        if ((error as DOMException).name !== "AbortError") setStatus("failed");
      });
  };

  const isSupported =
    "MediaSource" in window &&
    MediaSource.isTypeSupported('video/webm; codecs="vp8"');
  return (
    <div className="puzzle s900-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.intro)}</p>
      <div className="s900-workbench">
        <fieldset className="s900-reels">
          <legend className="sr-only">
            {stageText(props.locale, locale.reel)}
          </legend>
          {reelIds.map((reel) => (
            <button
              type="button"
              className="s900-reel"
              key={reel}
              disabled={
                !isSupported ||
                order.includes(reel) ||
                order.length === reelIds.length
              }
              onClick={() => setOrder((current) => [...current, reel])}
            >
              {stageText(props.locale, locale.reel)} {reel}
              <span className="s900-reel__sequence">
                {stageText(props.locale, locale.sequence)} {reelSequence[reel]}{" "}
                / {reelIds.length}
              </span>
            </button>
          ))}
        </fieldset>
        <ol
          className="s900-slots"
          aria-label={stageText(props.locale, locale.slot)}
        >
          {slots.map((slot) => (
            <li key={`slot-${slot}`}>
              {order[slot - 1] ?? stageText(props.locale, locale.slot)}
            </li>
          ))}
        </ol>
      </div>
      <div className="s900-actions">
        <button
          type="button"
          className="stage-action"
          disabled={
            !isSupported ||
            order.length !== reelIds.length ||
            status === "waiting"
          }
          onClick={assemble}
        >
          {stageText(props.locale, locale.assemble)}
        </button>
        <button
          type="button"
          onClick={() => {
            generationRef.current?.abort();
            setOrder([]);
            setStatus("idle");
          }}
        >
          {stageText(props.locale, locale.reset)}
        </button>
      </div>
      {videoUrl ? (
        <video
          ref={videoRef}
          className="s900-video"
          controls
          src={videoUrl}
          onEnded={(event) => {
            if (event.isTrusted && hasS900CorrectOrder(order)) problem.solve();
          }}
        >
          <track
            kind="captions"
            src={emptyCaptionsUrl}
            srcLang="en"
            label="Reel captions"
          />
        </video>
      ) : null}
      <output className="interaction-status" aria-live="polite">
        {!isSupported
          ? stageText(props.locale, locale.unsupported)
          : status === "waiting"
            ? stageText(props.locale, locale.waiting)
            : status === "ready"
              ? stageText(props.locale, locale.ready)
              : status === "wrong"
                ? stageText(props.locale, locale.wrongOrder)
                : status === "failed"
                  ? stageText(props.locale, locale.failed)
                  : ""}
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SwapHorizOutlined,
      color: "#f43f5e",
      label: locale.B01,
    },
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
