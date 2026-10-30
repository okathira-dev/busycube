import "./styles.css";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
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
import { brightThreshold, darkThreshold, meanCameraRgb } from "./brightness";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-110
 *
 * 目的: カメラframe全体のRGB平均だけを観測し、順不同の暗/明の二箱を開く。
 * 最初の一手: カメラ表示を確認して月または太陽の箱を押し、カメラを覆う/明るい方向へ向ける。
 * 箱ごとの解法:
 * - B02「月」: 箱から明示的にカメラ観測を始め、実frame全体のRGB平均が34以下になると開く。最初の実観測でもよい。
 * - B03「太陽」: 箱からカメラ観測を始め、実RGB平均が204以上になると開く。暗い状態を先に観測する順序条件はない。
 * 使用API: getUserMediaのvideo capture、HTMLVideoElement、Canvas 2D drawImage/getImageData、200ms timer。
 * 権限・privacy: 開始前からカメラ利用を示し、箱の明示操作でvideo権限だけを要求する。32×24のframeはその場で平均値へ変換し、画像/映像/値を保存・送信しない。
 * 対応環境: secure contextでカメラ/Canvas 2D pixel読取を使えるbrowser。平均はluxではなく、34/204は合意済みの仮しきい値。自動露出等の実機差は別途調整対象。
 */
function S110Stage(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [status, setStatus] = useState("idle");
  const generationRef = useRef(0);
  const cleanupRef = useRef<() => void>(() => {});
  const busy = useRef(false);
  const activeCapture = useRef(false);
  useEffect(() => {
    const stop = () => {
      generationRef.current++;
      cleanupRef.current();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);
  useEffect(() => {
    const host = rootRef.current?.closest<HTMLElement>(".stage-view");
    if (!host || brightness === null) return;
    const previousLight = host.style.getPropertyValue("--s110-light");
    const previousInk = host.style.getPropertyValue("--s110-ink");
    const hadClass = host.classList.contains("s110-camera-host");
    const gray = Math.round(brightness);
    host.style.setProperty("--s110-light", `rgb(${gray}, ${gray}, ${gray})`);
    host.style.setProperty("--s110-ink", gray < 118 ? "#ffffff" : "#101018");
    host.classList.add("s110-camera-host");
    return () => {
      if (!hadClass) host.classList.remove("s110-camera-host");
      if (previousLight) host.style.setProperty("--s110-light", previousLight);
      else host.style.removeProperty("--s110-light");
      if (previousInk) host.style.setProperty("--s110-ink", previousInk);
      else host.style.removeProperty("--s110-ink");
    };
  }, [brightness]);
  const start = async () => {
    if (busy.current || activeCapture.current || props.signal.aborted) return;
    const generation = ++generationRef.current;
    cleanupRef.current();
    busy.current = true;
    setStatus("waiting");
    setBrightness(null);
    const current = () =>
      !props.signal.aborted && generation === generationRef.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
        audio: false,
      });
      if (!current()) {
        stopMediaStream(stream);
        return;
      }
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      let timer: number | undefined;
      let active = true;
      const ended = () => {
        if (active && current()) {
          stop();
          setStatus("error");
        }
      };
      const stop = () => {
        if (!active) return;
        active = false;
        activeCapture.current = false;
        if (timer !== undefined) clearInterval(timer);
        for (const track of stream.getTracks())
          track.removeEventListener("ended", ended);
        video.pause();
        video.srcObject = null;
        stopMediaStream(stream);
      };
      cleanupRef.current = stop;
      if (!stream.getVideoTracks().some((track) => track.readyState === "live"))
        throw new Error("No live video track");
      for (const track of stream.getVideoTracks())
        track.addEventListener("ended", ended);
      await video.play();
      if (!current()) {
        stop();
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 24;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      const solved = new Set<string>();
      const sample = () => {
        if (
          !active ||
          !current() ||
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        )
          return;
        try {
          context.drawImage(video, 0, 0, 32, 24);
          const mean = meanCameraRgb(context.getImageData(0, 0, 32, 24).data);
          if (mean === undefined) return;
          setBrightness(mean);
          for (const id of [
            mean <= darkThreshold ? manifest.box.B02 : undefined,
            mean >= brightThreshold ? manifest.box.B03 : undefined,
          ]) {
            if (id && !solved.has(id)) {
              solved.add(id);
              props.boxes[id].solve();
            }
          }
        } catch {
          stop();
          if (current()) setStatus("error");
        }
      };
      activeCapture.current = true;
      setStatus("active");
      sample();
      if (active) timer = window.setInterval(sample, 200);
    } catch (error) {
      if (!current()) return;
      cleanupRef.current();
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "error",
      );
    } finally {
      busy.current = false;
    }
  };
  return (
    <div ref={rootRef} className="puzzle puzzle--centered s110-stage">
      <span className="s110-camera">
        <CameraAltOutlined />
        <span>{stageText(props.locale, locale.camera)}</span>
      </span>
      <div className="problem-row s110-boxes">
        <StageProblemGiftBox
          box={props.boxes[manifest.box.B02]}
          locale={props.locale}
          onClick={() => void start()}
        />
        <StageProblemGiftBox
          box={props.boxes[manifest.box.B03]}
          locale={props.locale}
          onClick={() => void start()}
        />
      </div>
      <p role="status">{statusText(props.locale, status)}</p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: DarkModeOutlined,
      color: "#8b5cf6",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: LightModeOutlined,
      color: "#facc15",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "mediaDevices" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S110Stage,
});
