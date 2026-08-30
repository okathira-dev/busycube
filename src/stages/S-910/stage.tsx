import SubtitlesOutlined from "@mui/icons-material/SubtitlesOutlined";
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
import { activeS910CueId, type S910CueId, s910Cues } from "./functions";
import { locale } from "./locale";

const videoUrl = new URL(
  "../../fixtures/s910/assets/caption-stage.webm",
  import.meta.url,
).href;
const emptyCaptionsUrl = new URL(
  "../../fixtures/s910/assets/empty.vtt",
  import.meta.url,
).href;

const cueTextKeys: Record<
  S910CueId,
  "redCircle" | "blueTriangle" | "yellowSquare"
> = {
  circle: "redCircle",
  triangle: "blueTriangle",
  square: "yellowSquare",
};

/**
 * S-910 — 再生中に作る字幕
 *
 * 目的: videoの現在時刻に合わせてruntime `VTTCue`を作り、実`TextTrack.activeCues`へ入る瞬間を3種類そろえる。
 * 最初の一手: native videoを再生し、赤い円が映っている間に「赤い円」の字幕buttonを押す。その後も映像の記号と同じbuttonを押す。
 * 箱ごとの解法:
 * - B01: 再生中、赤い円にはcircle、青い三角にはtriangle、黄色い四角にはsquareのcueをそれぞれ追加する。各cueの`cuechange`時にIDと映像の現在区間が一致し、3 IDすべてが記録されると開く。
 * 使用API: HTMLVideoElementの`currentTime`と`paused`、`addTextTrack()`、WebVTT `VTTCue`、`TextTrack.addCue()`、`cuechange`、`activeCues`。
 * 権限・privacy: 権限・保存・送信は使わず、生成したcueと一致済みIDは現在のstage訪問中のmemoryだけで扱う。
 * 対応環境: native WebM video、runtime TextTrack、`VTTCue`、`activeCues`を提供するbrowser。
 */
function S910Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<TextTrack | null>(null);
  const cueRefs = useRef<VTTCue[]>([]);
  const matchedRef = useRef<Set<S910CueId>>(new Set());
  const [status, setStatus] = useState<"waiting" | "added" | "complete">(
    "waiting",
  );
  const [revision, setRevision] = useState(0);
  const supported = "VTTCue" in window;

  useEffect(() => {
    void revision;
    const video = videoRef.current;
    if (!video || !supported) return;
    const track = video.addTextTrack(
      "captions",
      "Busycube live captions",
      "en",
    );
    track.mode = "showing";
    trackRef.current = track;
    const inspect = () => {
      const activeCues = Array.from(track.activeCues ?? []);
      for (const cue of activeCues) {
        const cueId = s910Cues.find(
          (expected) => (cue as VTTCue).id === expected.id,
        )?.id;
        const current = activeS910CueId(video.currentTime);
        if (cueId && cueId === current) matchedRef.current.add(cueId);
      }
      if (matchedRef.current.size === s910Cues.length) {
        problem.solve();
        setStatus("complete");
      }
    };
    track.addEventListener("cuechange", inspect);
    return () => {
      track.removeEventListener("cuechange", inspect);
      for (const cue of cueRefs.current) track.removeCue(cue);
      track.mode = "disabled";
      cueRefs.current = [];
      trackRef.current = null;
      video.pause();
    };
  }, [problem.solve, revision, supported]);

  const addCaption = (id: S910CueId) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video || !track || !supported || video.paused) return;
    const cue = new VTTCue(
      video.currentTime,
      Math.min(video.duration, video.currentTime + 0.45),
      stageText(props.locale, locale[cueTextKeys[id]]),
    );
    cue.id = id;
    cueRefs.current.push(cue);
    track.addCue(cue);
    setStatus("added");
  };

  const reset = () => {
    matchedRef.current.clear();
    setStatus("waiting");
    setRevision((current) => current + 1);
  };

  return (
    <div className="puzzle s910-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.intro)}</p>
      <div className="s910-player">
        <video ref={videoRef} className="s910-video" controls src={videoUrl}>
          <track
            kind="captions"
            src={emptyCaptionsUrl}
            srcLang="en"
            label="Runtime captions"
          />
        </video>
      </div>
      <div className="s910-captions">
        {s910Cues.map((cue) => (
          <button
            type="button"
            key={cue.id}
            disabled={!supported}
            onClick={() => addCaption(cue.id)}
          >
            {stageText(props.locale, locale[cueTextKeys[cue.id]])}
          </button>
        ))}
      </div>
      <button type="button" onClick={reset}>
        {stageText(props.locale, locale.reset)}
      </button>
      <output className="interaction-status" aria-live="polite">
        {!supported
          ? stageText(props.locale, locale.unsupported)
          : stageText(props.locale, locale[status])}
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: SubtitlesOutlined,
      color: "#e879f9",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "VTTCue" in window ? "available" : "unsupported",
    ),
  Component: S910Stage,
});
