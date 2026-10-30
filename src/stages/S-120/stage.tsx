import "./styles.css";
import MicOutlined from "@mui/icons-material/MicOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
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
import { audioProcessingReport, QuietThenLoud, unweightedRms } from "./rms";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-120
 *
 * 目的: 実マイクの短時間RMSで静音を確認してから大きい音を受け付け、騒がしい開始直後の達成を防ぐ。
 * 最初の一手: スピーカーの箱を押してマイクを許可し、静かな状態から大きな音を出す。輪が実音量へ反応する。
 * 箱ごとの解法:
 * - B02「音波の出るスピーカー」: 実Float time-domain 2048 sampleの無補正RMSが0.05未満の状態を500ms観測し、その後0.2超を検出すると即座に開く。最後に静かになる条件はない。欠損/250ms超の観測断/非表示で静音確認をresetする。
 * 使用API: getUserMediaのaudio constraints/getSupportedConstraints/getSettings、AudioContext/AnalyserNode.getFloatTimeDomainData、requestAnimationFrame。
 * 権限・privacy: 箱の明示操作でマイク権限を要求する。AGC/ノイズ抑制/エコー除去のoffを要求し、対応有無と報告設定だけを確認する。音声はRMS計算のmemoryだけで扱い、録音/保存/再生/送信しない。
 * 対応環境: secure contextのMediaDevices/Web Audio。窓長は約43〜46ms（48/44.1kHz時）。RMSは相対信号レベルでPa/dB SPLではなく、A特性等は使わない。しきい値と静音時間は実機調整対象。報告されないOS/端末内部補正の無効化まで保証しない。
 */
function S120Stage(props: Props) {
  const [status, setStatus] = useState("idle");
  const [level, setLevel] = useState(0);
  const [processing, setProcessing] = useState<string>();
  const cleanupRef = useRef<() => void>(() => {});
  const generationRef = useRef(0);
  const busy = useRef(false);
  const capturing = useRef(false);
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
  const start = async () => {
    if (busy.current || capturing.current || props.signal.aborted) return;
    const generation = ++generationRef.current;
    cleanupRef.current();
    busy.current = true;
    setStatus("waiting");
    setProcessing(undefined);
    setLevel(0);
    const current = () =>
      generation === generationRef.current && !props.signal.aborted;
    let context: AudioContext | undefined;
    let stream: MediaStream | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    let frame: number | undefined;
    let active = true;
    const gate = new QuietThenLoud();
    const visibility = () => {
      if (document.hidden) gate.reset();
    };
    const ended = () => {
      if (active && current()) {
        stop();
        setStatus("error");
      }
    };
    const stop = () => {
      if (!active) return;
      active = false;
      capturing.current = false;
      gate.reset();
      if (frame !== undefined) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      if (stream) {
        for (const track of stream.getTracks())
          track.removeEventListener("ended", ended);
        stopMediaStream(stream);
      }
      source?.disconnect();
      analyser?.disconnect();
      if (context && context.state !== "closed")
        void context.close().catch(() => {});
    };
    cleanupRef.current = stop;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
        setStatus("unavailable");
        return;
      }
      context = new AudioContext({ latencyHint: "interactive" });
      // gesture中にresumeを要求し、許可待ち中にcloseされても未処理rejectionを残さない。
      const resumed = context.resume().then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      const received = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: { ideal: false },
          noiseSuppression: { ideal: false },
          echoCancellation: { ideal: false },
          channelCount: { ideal: 1 },
        },
        video: false,
      });
      if (!current()) {
        stopMediaStream(received);
        return;
      }
      stream = received;
      const track = stream
        .getAudioTracks()
        .find((track) => track.readyState === "live");
      if (!track) throw new Error("No live audio track");
      track.addEventListener("ended", ended);
      const resumeResult = await resumed;
      if (!resumeResult.ok) throw resumeResult.error;
      if (!current()) {
        stop();
        return;
      }
      if (context.state !== "running")
        throw new Error("Audio context not running");
      const report = audioProcessingReport(
        navigator.mediaDevices.getSupportedConstraints?.() ?? {},
        track.getSettings(),
      );
      setProcessing(report.state);
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let lastPaint = -Infinity;
      const sample = (time: number) => {
        if (!active || !current() || !context || !analyser) return;
        try {
          if (
            document.hidden ||
            context.state !== "running" ||
            track.muted ||
            track.readyState !== "live"
          )
            gate.reset();
          else {
            analyser.getFloatTimeDomainData(samples);
            const rms = unweightedRms(samples);
            if (rms !== undefined && time - lastPaint >= 100) {
              setLevel(rms);
              lastPaint = time;
            }
            if (gate.observe(rms, time)) {
              setLevel(rms ?? 0);
              props.boxes[manifest.box.B02].solve();
              setStatus("success");
              stop();
              return;
            }
          }
        } catch {
          stop();
          if (current()) setStatus("error");
          return;
        }
        frame = requestAnimationFrame(sample);
      };
      document.addEventListener("visibilitychange", visibility);
      capturing.current = true;
      setStatus("active");
      frame = requestAnimationFrame(sample);
    } catch (error) {
      stop();
      if (current())
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
    <div className="puzzle puzzle--centered s120-stage">
      <span className="s120-microphone">
        <MicOutlined />
        <span>{stageText(props.locale, locale.microphone)}</span>
      </span>
      <div className="s120-ring-space" aria-hidden="true">
        <div
          className="sound-ring"
          style={{ transform: `scale(${1 + Math.min(1, level * 3)})` }}
        />
      </div>
      <StageProblemGiftBox
        box={props.boxes[manifest.box.B02]}
        locale={props.locale}
        onClick={() => void start()}
      />
      <p role="status">{statusText(props.locale, status)}</p>
      {processing === "enabled" || processing === "unknown" ? (
        <small>
          {stageText(
            props.locale,
            processing === "enabled"
              ? locale.processingEnabled
              : locale.processingUnknown,
          )}
        </small>
      ) : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: VolumeUpOutlined,
      color: "#22d3ee",
      label: locale.B02,
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
