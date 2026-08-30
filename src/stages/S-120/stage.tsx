import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
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
 * S-120
 *
 * 目的: microphone入力を録音せず音量の時間波形へ変換し、静か→大きい音→静かという三段階を検出する。
 * 最初の一手: 「音を見る」を押してmicrophoneを許可し、静かな状態を作ってから一度大きな音を出し、再び静かにする。
 * 箱ごとの解法:
 * - B01「音の箱」: time-domain sampleのRMSが0.05未満、続いて0.2超、最後に0.06未満の順で同じcapture中に観測されると開く。
 * 使用API: `getUserMedia({audio:true})`、Web Audio APIの`AudioContext` / `AnalyserNode.getByteTimeDomainData()`、`requestAnimationFrame()`。
 * 権限・privacy: microphone権限だけを明示操作後に要求し、生sampleはRMS計算にだけ使う。音声を録音・保存・再生・送信しない。
 * 対応環境: secure contextでMediaDevicesとWeb Audio APIを利用でき、microphone入力を提供できるbrowserと端末。
 */
function S120Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<InteractionState>("idle");
  const [level, setLevel] = useState(0);
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
        audio: true,
        video: false,
      });
      let context: AudioContext | null = null;
      let source: MediaStreamAudioSourceNode | null = null;
      let animationFrame = 0;
      cleanupRef.current = () => {
        cancelAnimationFrame(animationFrame);
        source?.disconnect();
        stopMediaStream(stream);
        if (context) void context.close();
      };
      if (props.signal.aborted) {
        cleanupRef.current();
        return;
      }
      context = new AudioContext();
      source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let phase = 0;
      let lastPaint = 0;

      const sample = (time: number) => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / samples.length);
        if (time - lastPaint > 100) {
          setLevel(rms);
          lastPaint = time;
        }
        if (phase === 0 && rms < 0.05) phase = 1;
        else if (phase === 1 && rms > 0.2) phase = 2;
        else if (phase === 2 && rms < 0.06) {
          problem.solve();
        }
        animationFrame = requestAnimationFrame(sample);
      };
      animationFrame = requestAnimationFrame(sample);

      // Only the RMS scalar reaches React state; samples are never persisted or sent.
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
      <div
        className="sound-ring"
        style={{ transform: `scale(${1 + Math.min(1, level * 3)})` }}
        aria-hidden="true"
      />
      <button
        type="button"
        className="stage-action"
        onClick={() => void start()}
      >
        {stageText(props.locale, locale.seeSound)}
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
      icon: VolumeUpOutlined,
      color: "#22d3ee",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "mediaDevices" in navigator && "AudioContext" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S120Stage,
});
