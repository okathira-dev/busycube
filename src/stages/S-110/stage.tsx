import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { stopMediaStream } from "../shared/media";
import { locale } from "./locale";

type InteractionState = "idle" | "active" | "denied" | "unavailable";

/**
 * S-110
 *
 * 目的: camera映像の内容を認識せず、frame全体から導出した明るさの暗→明という順序だけを観測する。
 * 最初の一手: 「光だけを見る」を押してcameraを許可し、背面cameraを手などで暗く覆ってから明るい方向へ向ける。
 * 箱ごとの解法:
 * - B01「光の箱」: 200 ms間隔の平均RGB輝度で一度55未満を観測した後、同じcapture中に165超を観測すると開く。
 * 使用API: Media Capture and Streamsの`getUserMedia()`、HTMLVideoElement、Canvas 2Dの`drawImage()` / `getImageData()`、timer。
 * 権限・privacy: video権限だけを明示操作後に要求する。32×24 frameはmemory内で平均値へ変換し、pixel・画像・映像を保存・送信しない。
 * 対応環境: secure contextでcameraとMediaDevices、video再生、Canvas 2D pixel読取を利用できるbrowserと端末。
 */
function S110Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<InteractionState>("idle");
  const [brightness, setBrightness] = useState(0);
  const cleanupRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const cleanup = () => cleanupRef.current();
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal]);

  const start = async () => {
    cleanupRef.current();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
        audio: false,
      });
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      let timer: number | undefined;
      cleanupRef.current = () => {
        if (timer !== undefined) window.clearInterval(timer);
        stopMediaStream(stream);
        video.srcObject = null;
      };
      if (props.signal.aborted) {
        cleanupRef.current();
        return;
      }
      await video.play();
      if (props.signal.aborted) {
        cleanupRef.current();
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 24;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      let darkSeen = false;
      timer = window.setInterval(() => {
        if (!context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
          return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let total = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          total +=
            ((pixels[index] ?? 0) +
              (pixels[index + 1] ?? 0) +
              (pixels[index + 2] ?? 0)) /
            3;
        }
        const nextBrightness = total / (pixels.length / 4);
        setBrightness(nextBrightness);
        if (nextBrightness < 55) darkSeen = true;
        if (darkSeen && nextBrightness > 165) {
          problem.solve();
        }
      }, 200);

      // Derived luminance exists only for this attempt; no pixel leaves memory.
      setStatus("active");
    } catch (error) {
      cleanupRef.current();
      if (props.signal.aborted) return;
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "unavailable",
      );
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="light-meter" aria-hidden="true">
        <span
          style={{ width: `${Math.min(100, (brightness / 255) * 100)}%` }}
        />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void start()}
      >
        {stageText(props.locale, locale.seeOnlyLight)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: LightModeOutlined,
      color: "#facc15",
      label: locale.B01,
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
