import ColorizeOutlined from "@mui/icons-material/ColorizeOutlined";
import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { stopMediaStream } from "../shared/media";
import { locale } from "./locale";

type Signal = {
  sender: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
type InteractionState = "idle" | "active" | "cancelled" | "unavailable";

function containsArmedMarker(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || video.videoWidth === 0) return false;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let cyan = 0,
    magenta = 0,
    yellow = 0,
    black = 0;
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index] ?? 0,
      g = data[index + 1] ?? 0,
      b = data[index + 2] ?? 0;
    if (r < 30 && g > 210 && b > 210) cyan += 1;
    if (r > 210 && g < 30 && b > 210) magenta += 1;
    if (r > 210 && g > 210 && b < 30) yellow += 1;
    if (r < 20 && g < 20 && b < 20) black += 1;
  }
  return Math.min(cyan, magenta, yellow, black) >= 18;
}

/**
 * S-190
 *
 * 目的: browserの画面共有streamを、browser surface・MediaRecorder・別windowへのWebRTC relay・共有映像内の色markerという四方向から検証する。
 * 最初の一手: 「観測窓を開く」と「地図を開く」で同じroundの二つのtabを用意し、「画面を取り込む」から地図tabをbrowser tabとして共有する。
 * 箱ごとの解法:
 * - B01「再帰画面の箱」: 共有videoを150 ms間隔で12 frame以上読み、共有trackの`displaySurface`が厳密に`browser`なら開く。
 * - B02「録画の箱」: 共有streamから`MediaRecorder`を1,000 ms timesliceで開始し、`dataavailable`でsize 0超のrecorded chunkを得ると開く。
 * - B03「中継の箱」: 同じroundの観測窓と`BroadcastChannel`でWebRTC signalingし、観測窓側`RTCPeerConnection`の`track` eventで共有映像を受信・再生できると開く。
 * - B04「外縁の印の箱」: 同じroundの地図tabをchannel handshakeでarmし、その共有映像を160×90 canvasへscanしてcyan・magenta・yellow・blackの厳密な色pixelを各18個以上検出すると開く。
 * 使用API: `getDisplayMedia()`、MediaStreamTrack settings、HTMLVideoElement、MediaRecorder、RTCPeerConnection、BroadcastChannel、Canvas 2D pixel読取、Web Crypto UUID。
 * 権限・privacy: screen共有権限はbutton操作時にbrowser標準pickerで要求する。選択surfaceはlocal preview・同一端末tab間relay・一時的な色判定にだけ使い、録画chunkやframeを保存・server送信しない。
 * 対応環境: secure contextでscreen capture、browser-tab `displaySurface`、MediaRecorder、WebRTC、BroadcastChannel、Canvas 2Dを利用できるbrowser。
 */
function S190Stage(props: Props) {
  const recursive = props.boxes[manifest.box.B01];
  const recording = props.boxes[manifest.box.B02];
  const relay = props.boxes[manifest.box.B03];
  const marker = props.boxes[manifest.box.B04];
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<() => void>(() => undefined);
  const params = useMemo(() => new URL(location.href).searchParams, []);
  const round = useMemo(
    () => params.get("round") ?? crypto.randomUUID(),
    [params],
  );
  const observer = params.get("observer") === "1";
  const [status, setStatus] = useState<InteractionState>("idle");
  const [frames, setFrames] = useState(0);

  useEffect(() => {
    const markerChannel = new BroadcastChannel(
      `busycube:catalogue-marker:${round}`,
    );
    const arm = (event: MessageEvent<unknown>) => {
      if (event.data === `hello:${round}`)
        markerChannel.postMessage(`arm:${round}`);
    };
    markerChannel.addEventListener("message", arm);
    const cleanup = () => {
      cleanupRef.current();
      markerChannel.close();
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal, round]);

  useEffect(() => {
    if (!observer) return;
    const signaling = new BroadcastChannel(`busycube:S-190:relay:${round}`);
    const sender = crypto.randomUUID();
    const peer = new RTCPeerConnection({ iceServers: [] });
    peer.ontrack = async (event) => {
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      await video.play();
      relay.solve();
      setStatus("active");
    };
    peer.onicecandidate = (event) => {
      if (event.candidate)
        signaling.postMessage({
          sender,
          candidate: event.candidate.toJSON(),
        } satisfies Signal);
    };
    const receive = async (event: MessageEvent<Signal>) => {
      if (event.data.sender === sender) return;
      if (event.data.description?.type === "offer") {
        await peer.setRemoteDescription(event.data.description);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        signaling.postMessage({ sender, description: answer } satisfies Signal);
      }
      if (event.data.candidate)
        await peer.addIceCandidate(event.data.candidate);
    };
    signaling.addEventListener("message", receive);
    signaling.postMessage({
      sender,
      description: { type: "rollback" },
    } satisfies Signal);
    return () => {
      peer.close();
      signaling.close();
    };
  }, [observer, relay.solve, round]);

  const start = async () => {
    cleanupRef.current();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      } as DisplayMediaStreamOptions);
      const video = videoRef.current;
      if (!video) {
        stopMediaStream(stream);
        return;
      }
      video.srcObject = stream;
      if (props.signal.aborted) {
        stopMediaStream(stream);
        return;
      }
      await video.play();
      const timers: number[] = [];
      const peer = new RTCPeerConnection({ iceServers: [] });
      const signaling = new BroadcastChannel(`busycube:S-190:relay:${round}`);
      const sender = crypto.randomUUID();
      for (const track of stream.getTracks()) peer.addTrack(track, stream);
      peer.createDataChannel("capture-live");
      peer.onicecandidate = (event) => {
        if (event.candidate)
          signaling.postMessage({
            sender,
            candidate: event.candidate.toJSON(),
          } satisfies Signal);
      };
      signaling.addEventListener(
        "message",
        async (event: MessageEvent<Signal>) => {
          if (event.data.sender === sender) return;
          try {
            if (event.data.description?.type === "answer")
              await peer.setRemoteDescription(event.data.description);
            if (event.data.candidate)
              await peer.addIceCandidate(event.data.candidate);
          } catch {}
        },
      );
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      signaling.postMessage({ sender, description: offer } satisfies Signal);
      let recorder: MediaRecorder | undefined;
      if ("MediaRecorder" in window) {
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recording.solve();
        };
        recorder.start(1000);
      }
      let observedFrames = 0;
      timers.push(
        window.setInterval(() => {
          if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
          observedFrames += 1;
          setFrames(observedFrames);
          const surface = stream
            .getVideoTracks()[0]
            ?.getSettings().displaySurface;
          if (observedFrames >= 12 && surface === "browser") recursive.solve();
          const canvas = scanRef.current;
          if (canvas && containsArmedMarker(video, canvas)) marker.solve();
        }, 150),
      );
      cleanupRef.current = () => {
        timers.forEach((timer) => {
          clearInterval(timer);
        });
        if (recorder?.state !== "inactive") recorder?.stop();
        peer.close();
        signaling.close();
        stopMediaStream(stream);
        video.srcObject = null;
      };
      stream
        .getVideoTracks()[0]
        ?.addEventListener("ended", cleanupRef.current, { once: true });
      setStatus("active");
    } catch (error) {
      cleanupRef.current();
      if (props.signal.aborted) return;
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "cancelled"
          : "unavailable",
      );
    }
  };
  const observerUrl = new URL(location.href);
  observerUrl.searchParams.set("round", round);
  observerUrl.searchParams.set("observer", "1");
  const mapUrl = new URL(location.href);
  mapUrl.searchParams.delete("stage");
  mapUrl.searchParams.set("catalogue-round", round);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {[recursive, recording, relay, marker].map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <video
        ref={videoRef}
        className="capture-preview"
        muted
        playsInline
        aria-label={
          observer
            ? stageText(props.locale, locale.relayedScreen)
            : stageText(props.locale, locale.sharedScreen)
        }
      >
        <track
          kind="captions"
          src="data:text/vtt,WEBVTT"
          srcLang="en"
          label={stageText(props.locale, locale.noAudio)}
          default
        />
      </video>
      <canvas ref={scanRef} width="160" height="90" hidden />
      {!observer && (
        <div className="stage-actions">
          <button
            type="button"
            className="stage-action"
            onClick={() => void start()}
          >
            {stageText(props.locale, locale.captureScreen)}
          </button>
          <button
            type="button"
            className="stage-action"
            onClick={() => window.open(observerUrl, "_blank")}
          >
            {stageText(props.locale, locale.openObserver)}
          </button>
          <button
            type="button"
            className="stage-action"
            onClick={() => window.open(mapUrl, "_blank")}
          >
            {stageText(props.locale, locale.openMap)}
          </button>
        </div>
      )}
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)} · {frames}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DesktopWindowsOutlined,
      color: "#22d3ee",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: DesktopWindowsOutlined,
      color: "#38bdf8",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: WindowOutlined,
      color: "#818cf8",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: ColorizeOutlined,
      color: "#facc15",
      label: locale.B04,
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
