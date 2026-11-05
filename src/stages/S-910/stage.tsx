import "./styles.css";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import SubtitlesOutlined from "@mui/icons-material/SubtitlesOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import {
  activeS910CueId,
  captionInterval,
  cueSymbols,
  type S910CueId,
  s910Cues,
  validS910Cue,
} from "./functions";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const videoUrl = new URL(
  "../../fixtures/s910/assets/caption-stage.webm",
  import.meta.url,
).href;
const emptyCaptionsUrl = new URL(
  "../../fixtures/s910/assets/empty.vtt",
  import.meta.url,
).href;

/**
 * S-910
 *
 * 目的: 映像の記号と字幕の全表示区間を合わせ、正しい三種だけのruntime TextTrackを作る。
 * 最初の一手: 映像の円を再生または停止して表示し、○を押してその場の字幕を追加する。
 * 箱ごとの解法:
 * - B02「字幕線」: 円/三角/四角が映る時刻に対応記号の実VTTCueを追加し、それぞれを実activeCuesで一度以上観測する。native track.cuesの全字幕が正しい種類と記号で、全表示区間がその記号の実frame区間内に収まる場合だけ開く。誤字幕や記号のない時刻の字幕は一つでも残ると開かず、丸矢印で全字幕を除去して作り直せる。
 * 使用API: Fetch/Blob URLで同梱映像を読み、HTMLVideoElementのcurrentTime/duration、VTTCue、addTextTrack/addCue/removeCue、実cues/activeCues、cuechange/seeked/timeupdateを観測する。
 * 権限・privacy: 権限不要。生成字幕と観測済みcueは訪問memoryのみで扱い、保存・送信しない。同梱videoだけを再生する。
 * 対応環境: WebM VP8、runtime TextTrack/VTTCue対応browser。停止中も追加可能。字幕長は最大0.45秒で実frame区間末尾へ切り詰め、終端は排他的に扱う。
 */
function S910Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<TextTrack | null>(null);
  const seen = useRef(new Set<VTTCue>());
  const inspectRef = useRef<() => void>(() => {});
  const frameRef = useRef<number | null>(null);
  const [matched, setMatched] = useState<readonly string[]>([]);
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>();
  const supported = typeof window.VTTCue === "function";
  useEffect(() => {
    const controller = new AbortController();
    let ownedUrl: string | undefined;
    const stop = () => {
      controller.abort();
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) controller.abort();
    // 小さな固定映像を一度読み、HTTP Rangeの実装差に依存せずnative seekできるBlobへ渡す。
    void fetch(videoUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Video unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        if (!blob.size || blob.size > 1_048_576)
          throw new Error("Invalid fixed video");
        ownedUrl = URL.createObjectURL(blob);
        setMediaUrl(ownedUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !supported || props.signal.aborted) return;
    let track: TextTrack;
    try {
      track = video.addTextTrack("captions", "Busycube", props.locale);
    } catch {
      setFailed(true);
      return;
    }
    let active = true;
    let solved = false;
    track.mode = "showing";
    trackRef.current = track;
    const inspect = () => {
      if (!active || props.signal.aborted) return;
      const all = Array.from(track.cues ?? []);
      for (const cue of Array.from(track.activeCues ?? [])) {
        if (
          cue instanceof VTTCue &&
          validS910Cue(cue) &&
          activeS910CueId(video.currentTime) === cue.id &&
          video.currentTime >= cue.startTime &&
          video.currentTime < cue.endTime
        )
          seen.current.add(cue);
      }
      const matches = all
        .filter(
          (cue) =>
            cue instanceof VTTCue && validS910Cue(cue) && seen.current.has(cue),
        )
        .map((cue) => cue.id);
      const hasInvalid = all.some(
        (cue) => !(cue instanceof VTTCue) || !validS910Cue(cue),
      );
      setMatched(matches);
      setInvalid(hasInvalid);
      if (
        !solved &&
        !hasInvalid &&
        s910Cues.every((cue) => matches.includes(cue.id))
      ) {
        solved = true;
        problem.solve();
      }
    };
    inspectRef.current = inspect;
    track.addEventListener("cuechange", inspect);
    video.addEventListener("seeked", inspect);
    video.addEventListener("timeupdate", inspect);
    const stop = () => {
      active = false;
      video.pause();
      track.removeEventListener("cuechange", inspect);
      video.removeEventListener("seeked", inspect);
      video.removeEventListener("timeupdate", inspect);
      for (const cue of Array.from(track.cues ?? [])) track.removeCue(cue);
      track.mode = "disabled";
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      seen.current.clear();
      trackRef.current = null;
      inspectRef.current = () => {};
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [problem.solve, props.locale, props.signal, supported]);
  const addCaption = (id: S910CueId) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video || !track || props.signal.aborted) return;
    const interval = captionInterval(video.currentTime, video.duration);
    if (!interval) return;
    try {
      const cue = new VTTCue(interval.start, interval.end, cueSymbols[id]);
      cue.id = id;
      track.addCue(cue);
      inspectRef.current();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        inspectRef.current();
      });
    } catch {
      setFailed(true);
    }
  };
  const reset = () => {
    const track = trackRef.current;
    if (!track) return;
    for (const cue of Array.from(track.cues ?? [])) track.removeCue(cue);
    seen.current.clear();
    setMatched([]);
    setInvalid(false);
  };
  return (
    <div className="puzzle s910-stage">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <video
        ref={videoRef}
        className="s910-video"
        controls
        preload="auto"
        src={mediaUrl}
        onError={() => setFailed(true)}
      >
        <track
          kind="captions"
          src={emptyCaptionsUrl}
          srcLang={props.locale}
          label="Busycube"
        />
      </video>
      <div className="s910-captions">
        {s910Cues.map((cue) => (
          <button
            type="button"
            key={cue.id}
            disabled={!supported || failed}
            aria-label={stageText(props.locale, locale[cue.id])}
            data-matched={matched.includes(cue.id)}
            onClick={() => addCaption(cue.id)}
          >
            {cueSymbols[cue.id]}
          </button>
        ))}
      </div>
      <button
        className="s910-reset"
        type="button"
        onClick={reset}
        data-invalid={invalid}
        aria-label={stageText(props.locale, locale.reset)}
      >
        <ReplayOutlined />
      </button>
      {!supported || failed ? (
        <p role="status">
          {stageText(
            props.locale,
            !supported ? locale.unsupported : locale.failed,
          )}
        </p>
      ) : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: SubtitlesOutlined,
      color: "#e879f9",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "VTTCue" in window && "addTextTrack" in HTMLMediaElement.prototype
        ? "available"
        : "unsupported",
    ),
  Component: S910Stage,
});
