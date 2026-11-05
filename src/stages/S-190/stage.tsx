import "./styles.css";
import CropFreeOutlined from "@mui/icons-material/CropFreeOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import ScreenShareOutlined from "@mui/icons-material/ScreenShareOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { stopMediaStream } from "../shared/media";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { type Marker, readMarkers } from "./markers";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-190
 *
 * 目的: 自分で選んだbrowserタブの実共有映像から、内外二種類のQRを認識する。
 * 最初の一手: 画面共有アイコンを押し、標準pickerでタブを選ぶ。
 * 箱ごとの解法:
 * - B05「四隅」: ステージのスクロール領域を探索し、右下のQRをタブ共有に映す。live video trackのdisplaySurfaceがbrowserで、実video frameのCanvas画素をjsQRがbusycube:S190:insideと復号すると開く。
 * - B06「地球と虫眼鏡」: 別タブで地図を開き、一覧最下部のQRを探索して共有へ映す。同じ実観測でbusycube:S190:outsideを復号すると開く。二箱の順序は問わない。
 * 使用API: getDisplayMedia、MediaStreamTrack.getSettings、HTMLVideoElement、Canvas 2D、jsQR。
 * 権限・privacy: 明示操作でbrowser標準pickerを開く。映像はlocal previewと一時的画素解析だけに使用し、録画・保存・server送信しない。
 * 対応環境: secure contextでbrowser-tab共有とdisplaySurface観測、Canvas画素読取ができるbrowser。
 */
function S190Stage(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const active = useRef(false);
  const busy = useRef(false);
  const opened = useRef(new Set<Marker>());
  const [status, setStatus] = useState("");
  useEffect(() => {
    active.current = true;
    const dispose = () => {
      active.current = false;
      cleanupRef.current();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal]);
  const current = () => active.current && !props.signal.aborted;
  const start = async () => {
    if (busy.current || !current()) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus("unavailable");
      return;
    }
    cleanupRef.current();
    busy.current = true;
    setStatus("pending");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const video = videoRef.current;
      if (!current() || !video) {
        stopMediaStream(stream);
        return;
      }
      const track = stream.getVideoTracks()[0];
      let timer: number | undefined;
      const stop = () => {
        if (timer !== undefined) clearInterval(timer);
        track?.removeEventListener("ended", ended);
        stopMediaStream(stream);
        video.pause();
        video.srcObject = null;
      };
      const ended = () => {
        stop();
        if (current()) setStatus("idle");
      };
      cleanupRef.current = stop;
      track?.addEventListener("ended", ended, { once: true });
      video.srcObject = stream;
      await video.play();
      if (!current()) {
        stop();
        return;
      }
      if (track?.readyState !== "live") {
        ended();
        return;
      }
      if (track.getSettings().displaySurface !== "browser") {
        setStatus("surface");
        return;
      }
      setStatus("active");
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      timer = window.setInterval(() => {
        if (
          !current() ||
          document.hidden ||
          track.readyState !== "live" ||
          track.muted ||
          track.getSettings().displaySurface !== "browser" ||
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          !video.videoWidth ||
          !video.videoHeight
        )
          return;
        const scale = Math.min(
          1,
          1280 / video.videoWidth,
          960 / video.videoHeight,
        );
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          for (const marker of readMarkers(
            context.getImageData(0, 0, canvas.width, canvas.height),
          )) {
            if (opened.current.has(marker)) continue;
            opened.current.add(marker);
            props.boxes[
              marker === "inside" ? manifest.box.B05 : manifest.box.B06
            ].solve();
          }
        } catch {
          stop();
          if (current()) setStatus("error");
        }
      }, 250);
    } catch (error) {
      cleanupRef.current();
      if (current())
        setStatus(
          error instanceof DOMException
            ? error.name === "NotAllowedError"
              ? "denied"
              : error.name === "AbortError"
                ? "cancelled"
                : error.name === "NotSupportedError"
                  ? "unavailable"
                  : "error"
            : "error",
        );
    } finally {
      busy.current = false;
    }
  };
  const mapUrl = new URL(location.href);
  mapUrl.search = "";
  mapUrl.searchParams.set("locale", props.locale);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row s190-boxes">
        {[manifest.box.B05, manifest.box.B06].map((id) => (
          <StageProblemGiftBox
            key={id}
            box={props.boxes[id]}
            locale={props.locale}
          />
        ))}
      </div>
      <video
        ref={videoRef}
        className="s190-preview"
        muted
        playsInline
        aria-label={stageText(props.locale, locale.sharedScreen)}
      >
        <track
          kind="captions"
          src="data:text/vtt,WEBVTT"
          srcLang="en"
          label={stageText(props.locale, locale.noAudio)}
          default
        />
      </video>
      <div className="stage-actions">
        <button
          type="button"
          className="stage-action"
          onClick={() => void start()}
          aria-label={stageText(props.locale, locale.captureScreen)}
        >
          <ScreenShareOutlined />
        </button>
        <a
          className="stage-action"
          href={mapUrl.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={stageText(props.locale, locale.openMap)}
        >
          <OpenInNewOutlined />
        </a>
      </div>
      <p className="interaction-status" role="status">
        {status === "surface"
          ? stageText(props.locale, locale.browserOnly)
          : statusText(props.locale, status)}
      </p>
      <section
        className="s190-explore"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: 二軸scroll領域を矢印キーでも探索できるようにする。
        tabIndex={0}
        aria-label={stageText(props.locale, locale.explore)}
      >
        <div className="s190-world">
          <img
            className="s190-marker"
            src="/stage-capture-inside.svg"
            width="264"
            height="264"
            alt=""
          />
        </div>
      </section>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B05]: {
      icon: CropFreeOutlined,
      color: "#22d3ee",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: TravelExploreOutlined,
      color: "#818cf8",
      label: locale.B06,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "mediaDevices" in navigator &&
      "getDisplayMedia" in navigator.mediaDevices
        ? "permission-required"
        : "unsupported",
    ),
  Component: S190Stage,
});
