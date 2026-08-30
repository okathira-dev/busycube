import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

const recoverySource = new URL(
  "../../fixtures/media/assets/multi-audio.mp4",
  import.meta.url,
).href;

type AudioSessionLike = EventTarget & {
  state?: string;
  type?: string;
};

/**
 * S-430
 *
 * 目的: OS/browser所有のmedia controlから届くpause actionと、別音声によるAudio Session interruption後の再生復帰を観測する。
 * 最初の一手: 「音を始める」後にmedia key・headset・system media UIでpauseする。B02は「復帰を待つ音を始める」後、別appの音でinterruptしてからBusycube音声へ戻す。
 * 箱ごとの解法:
 * - B01「外側停止の箱」: 生成tone再生中にMedia Sessionへ登録した実`pause` action handlerが呼ばれると、toneを止めて開く。
 * - B02「音声復帰の箱」: 同じattemptのAudio Session `statechange`で一度`interrupted`を観測し、その後stateが`active`な時に対象audioの`playing` eventを受けると開く。
 * 使用API: Media Session API/MediaMetadata、Web Audio oscillator、HTMLAudioElement、Audio Session APIのtype/state/statechange。
 * 権限・privacy: 権限や音声入力を使わず、生成toneとGit管理済みfixtureだけを再生する。media keyやinterruption元の情報は取得・保存・送信しない。
 * 対応環境: B01はMedia SessionとWeb Audio、B02はAudio Session APIとOS audio focus復帰を実装するbrowser/OS。
 */
function S430Stage(props: Props) {
  const pause = props.boxes[manifest.box.B01];
  const recovery = props.boxes[manifest.box.B02];
  const context = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const recoveryAudio = useRef<HTMLAudioElement>(null);
  const interrupted = useRef(false);
  const [status, setStatus] = useState<
    "idle" | "paused" | "playing" | "waiting" | "unsupported"
  >("idle");
  const session = (
    navigator as Navigator & {
      audioSession?: AudioSessionLike;
    }
  ).audioSession;

  const stopGeneratedSound = useCallback(() => {
    try {
      oscillator.current?.stop();
    } catch {}
    oscillator.current = null;
    void context.current?.close();
    context.current = null;
  }, []);

  const startPauseSound = async () => {
    stopGeneratedSound();
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    gain.gain.value = 0.035;
    tone.connect(gain).connect(audio.destination);
    tone.start();
    context.current = audio;
    oscillator.current = tone;
    setStatus("playing");
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Busycube",
      artist: stageText(props.locale, locale.outsideControl),
    });
    navigator.mediaSession.playbackState = "playing";
    navigator.mediaSession.setActionHandler("pause", () => {
      stopGeneratedSound();
      navigator.mediaSession.playbackState = "paused";
      setStatus("paused");
      pause.solve();
    });
  };

  const startRecoverySound = async () => {
    const audio = recoveryAudio.current;
    if (!session || !audio) {
      setStatus("unsupported");
      return;
    }
    interrupted.current = false;
    session.type = "playback";
    try {
      await audio.play();
      setStatus("waiting");
    } catch {
      setStatus("idle");
    }
  };

  useEffect(() => {
    const onSessionStateChange = () => {
      if (session?.state === "interrupted") interrupted.current = true;
    };
    const onRecoveryPlaying = () => {
      if (interrupted.current && session?.state === "active") {
        recovery.solve();
      }
    };
    session?.addEventListener("statechange", onSessionStateChange);
    const audio = recoveryAudio.current;
    audio?.addEventListener("playing", onRecoveryPlaying);
    const cleanup = () => {
      stopGeneratedSound();
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.playbackState = "none";
      session?.removeEventListener("statechange", onSessionStateChange);
      if (session) session.type = "auto";
      audio?.pause();
      if (audio) audio.currentTime = 0;
      audio?.removeEventListener("playing", onRecoveryPlaying);
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal, recovery.solve, stopGeneratedSound]);

  const statusText =
    status === "paused"
      ? locale.pausedOutside
      : status === "playing"
        ? locale.playing
        : status === "waiting"
          ? locale.waitingForInterruption
          : status === "unsupported"
            ? locale.audioSessionUnsupported
            : locale.idle;

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={pause} locale={props.locale} />
        <StageProblemGiftBox box={recovery} locale={props.locale} />
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void startPauseSound()}
      >
        {stageText(props.locale, locale.startSound)}
      </button>
      <button
        type="button"
        className="stage-action"
        onClick={() => void startRecoverySound()}
      >
        {stageText(props.locale, locale.startRecovery)}
      </button>
      <audio
        ref={recoveryAudio}
        src={recoverySource}
        controls
        preload="metadata"
      >
        <track
          kind="captions"
          src={
            new URL(
              "../../fixtures/media/assets/captions-busy.vtt",
              import.meta.url,
            ).href
          }
          srcLang="en"
          label="Busycube"
        />
      </audio>
      <p role="status">{stageText(props.locale, statusText)}</p>
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
    [manifest.box.B02]: {
      icon: VolumeUpOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "mediaSession" in navigator && "AudioContext" in window
        ? "available"
        : "unsupported",
    ),
  Component: S430Stage,
});
