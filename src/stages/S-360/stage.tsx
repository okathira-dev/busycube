import "./styles.css";
import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import MicOutlined from "@mui/icons-material/MicOutlined";
import StopOutlined from "@mui/icons-material/StopOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import {
  AcousticReceiver,
  acousticIdentity,
  classifyIdentity,
  detectTone,
  encodeIdentity,
  preambleMs,
  symbolMs,
  toneFrequencies,
} from "./acoustic";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type Mode = "idle" | "starting" | "listening" | "playing";

/**
 * S-360
 *
 * 目的: 実スピーカーから出した符号を実マイクで認識し、同じ保存領域と異なる保存領域を区別する。
 * 最初の一手: 別タブまたは別端末の同じステージでスピーカーを押し、受信側では箱を押してマイクを許可する。
 * 箱ごとの解法:
 * - B03「窓」: 同じ保存領域を共有する別タブで符号を鳴らし、このページのマイクで受ける。同期音・version・CRCを含む完全な音響packetを復号し、送信元の16byte識別子が手元と一致したら開く。
 * - B04「二つの画面」: 異なる保存領域の別ブラウザーや別端末で符号を鳴らし、このページのマイクで受ける。完全なpacketを実復号し、有効な送信元識別子が手元と異なれば開く。手元の保存ID未取得は別環境の成功にしない。
 * 使用API: getUserMedia、Web Audio oscillator/AnalyserNode、requestAnimationFrame、Web Crypto SHA-256、ゲーム進捗のinstallationId。
 * 権限・privacy: 明示操作でマイク許可を要求。音声は端末内の短い解析窓だけで扱い録音・保存・外部送信しない。発音する識別子はゲームが発行した保存IDのstage固有hashであり、物理端末の証明ではない。
 * 対応環境: Web Audio・マイクとスピーカーを使えるsecure context。受信中は同じページから発音しない。
 */
function S360Stage(props: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const currentMode = useRef<Mode>("idle");
  const identity = useRef<Uint8Array | null>(null);
  const context = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);

  const stop = useCallback(() => {
    generation.current += 1;
    currentMode.current = "idle";
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => {
      track.stop();
    });
    stream.current = null;
    source.current?.disconnect();
    source.current = null;
    analyser.current?.disconnect();
    analyser.current = null;
    if (oscillator.current) {
      oscillator.current.onended = null;
      try {
        oscillator.current.stop();
      } catch {
        /* It may already have ended. */
      }
      oscillator.current.disconnect();
      oscillator.current = null;
    }
    const audio = context.current;
    context.current = null;
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    setMode("idle");
  }, []);

  useEffect(() => {
    let active = true;
    stop();
    identity.current = null;
    setReady(false);
    const id = props.services.installationId;
    if (!id) setStatus("storage");
    else
      void acousticIdentity(id)
        .then((value) => {
          if (!active || props.signal.aborted) return;
          identity.current = value;
          setReady(true);
          setStatus("");
        })
        .catch(() => {
          if (active && !props.signal.aborted) setStatus("error");
        });
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      active = false;
      identity.current = null;
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.services.installationId, props.signal, stop]);

  const listen = async () => {
    if (
      !identity.current ||
      currentMode.current !== "idle" ||
      props.signal.aborted
    )
      return;
    currentMode.current = "starting";
    setMode("starting");
    setStatus("");
    const attempt = generation.current;
    try {
      const captured = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (
        props.signal.aborted ||
        attempt !== generation.current ||
        currentMode.current !== "starting"
      ) {
        captured.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }
      stream.current = captured;
      const audio = new AudioContext();
      context.current = audio;
      await audio.resume();
      if (props.signal.aborted || context.current !== audio) return;
      const input = audio.createMediaStreamSource(captured);
      source.current = input;
      const meter = audio.createAnalyser();
      meter.fftSize = 2048;
      analyser.current = meter;
      input.connect(meter);
      const samples = new Float32Array(meter.fftSize);
      const receiver = new AcousticReceiver();
      currentMode.current = "listening";
      setMode("listening");
      const poll = () => {
        if (props.signal.aborted || context.current !== audio) return;
        meter.getFloatTimeDomainData(samples);
        const received = receiver.read(
          detectTone(samples, audio.sampleRate),
          audio.currentTime * 1000,
        );
        const match = received && classifyIdentity(identity.current, received);
        if (match) {
          (match === "same" ? props.boxes.B03 : props.boxes.B04).solve();
          stop();
          return;
        }
        frame.current = requestAnimationFrame(poll);
      };
      frame.current = requestAnimationFrame(poll);
    } catch (error) {
      if (attempt !== generation.current) return;
      stop();
      if (!props.signal.aborted)
        setStatus(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "denied"
            : "error",
        );
    }
  };

  const play = async () => {
    if (
      !identity.current ||
      currentMode.current !== "idle" ||
      props.signal.aborted
    )
      return;
    currentMode.current = "playing";
    setMode("playing");
    setStatus("");
    try {
      const audio = new AudioContext();
      context.current = audio;
      await audio.resume();
      if (
        props.signal.aborted ||
        context.current !== audio ||
        !identity.current
      )
        return;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.current = tone;
      tone.connect(gain).connect(audio.destination);
      let at = audio.currentTime + 0.04;
      const sequence = [
        { symbol: 4, duration: preambleMs },
        { symbol: 5, duration: preambleMs },
        { symbol: 4, duration: preambleMs },
        ...encodeIdentity(identity.current).map((symbol) => ({
          symbol,
          duration: symbolMs,
        })),
      ];
      for (const item of sequence) {
        const frequency = toneFrequencies[item.symbol];
        if (frequency === undefined) throw new Error("Invalid symbol");
        const seconds = item.duration / 1000;
        tone.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.035, at + 0.006);
        gain.gain.setValueAtTime(0.035, at + seconds - 0.006);
        gain.gain.linearRampToValueAtTime(0, at + seconds);
        at += seconds;
      }
      tone.onended = () => {
        gain.disconnect();
        if (context.current === audio) stop();
      };
      tone.start(audio.currentTime + 0.04);
      tone.stop(at);
    } catch {
      stop();
      if (!props.signal.aborted) setStatus("error");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div
        className="acoustic-signal"
        data-active={mode === "playing" || mode === "listening"}
        aria-hidden="true"
      >
        <WindowOutlined />
        <span>∿</span>
        <MicOutlined />
      </div>
      <button
        type="button"
        className="stage-action"
        aria-label={stageText(props.locale, locale.speaker)}
        disabled={!ready || mode !== "idle"}
        onClick={() => void play()}
      >
        <VolumeUpOutlined aria-hidden="true" />
      </button>
      {mode !== "idle" && (
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.stop)}
          onClick={stop}
        >
          <StopOutlined aria-hidden="true" />
        </button>
      )}
      <div className="problem-row">
        <StageProblemGiftBox
          box={props.boxes.B03}
          locale={props.locale}
          onClick={() => void listen()}
        />
        <StageProblemGiftBox
          box={props.boxes.B04}
          locale={props.locale}
          onClick={() => void listen()}
        />
      </div>
      <p role="status">
        {status === "storage"
          ? stageText(props.locale, locale.storage)
          : status
            ? statusText(props.locale, status)
            : null}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: WindowOutlined,
      tone: "cyan",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: DevicesOutlined,
      tone: "blue",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "AudioContext" in window &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
        ? "permission-required"
        : "unsupported",
    ),
  Component: S360Stage,
});
