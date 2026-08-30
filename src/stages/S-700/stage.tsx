import DesktopWindowsOutlined from "@mui/icons-material/DesktopWindowsOutlined";
import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import assetManifest from "../../fixtures/s700/assets/generation-manifest.json";
import { stageText } from "../locale";
import { locale } from "./locale";

type RemotePlaybackLike = EventTarget & {
  readonly state: "connecting" | "connected" | "disconnected";
  prompt(): Promise<void>;
  cancelWatchAvailability?(): Promise<void>;
};

type BarcodeDetectorResultLike = { readonly rawValue?: string };
type BarcodeDetectorLike = {
  detect(source: CanvasImageSource): Promise<BarcodeDetectorResultLike[]>;
};
type BarcodeDetectorConstructor = {
  new (options: { formats: ["qr_code"] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
};

type PresentationConnectionLike = EventTarget & {
  readonly state?: string;
  close(): void;
  terminate?(): void;
};
type PresentationRequestLike = {
  start(): Promise<PresentationConnectionLike>;
};

const slotFiles = {
  a: new URL("../../fixtures/s700/assets/remote-slot-a.webm", import.meta.url)
    .href,
  b: new URL("../../fixtures/s700/assets/remote-slot-b.webm", import.meta.url)
    .href,
  c: new URL("../../fixtures/s700/assets/remote-slot-c.webm", import.meta.url)
    .href,
  d: new URL("../../fixtures/s700/assets/remote-slot-d.webm", import.meta.url)
    .href,
} as const;

type RemoteSlot = (typeof assetManifest.assets)[number];
const remoteSlots = assetManifest.assets as [RemoteSlot, ...RemoteSlot[]];

/**
 * S-700
 *
 * 目的: mediaを外部再生先へ送るRemote Playbackの文字・QR経路と、独立receiver documentを開くPresentation APIを対比する。
 * 最初の一手: 「再生先を選ぶ」で外部displayへ接続し、「文字を映す」で外部画面の二語を手元へ転記する。QRとPresentationは各専用buttonで続ける。
 * 箱ごとの解法:
 * - B01「外部文字の箱」: connected中にrandom slotの0〜3.8秒を再生済みにし、外部画面の鍵（`silver orbit` / `quiet prism` / `amber signal` / `violet harbor`のcurrent一つ）をtrim・小文字化一致で入力すると開く。
 * - B02「外部QRの箱」: connected中に同じslotの4〜7.8秒を再生済みにし、背面cameraのnative BarcodeDetectorが15秒以内にcurrent slot固有QR tokenを読み、接続も維持中なら開く。
 * - B03「プレゼンテーションの箱」: random round付きreceiver URLを`PresentationRequest.start()`で外部displayへ開き、そのPresentationConnection messageが厳密に`ready:{round}`なら開く。
 * 使用API: Remote Playback/HTMLMediaElement、Barcode Detection API、`getUserMedia()`、Presentation API、Web Crypto random/UUID。
 * 権限・privacy: cameraはQR scan中だけ使用し、frameをnative detectorへ一時的に渡す。display/device名、frame、token、鍵、connection IDを保存・送信しない。
 * 対応環境: secure contextでRemote Playback receiverとnative QR BarcodeDetector付きcamera、またはPresentation対応displayを利用できるbrowser/OS。
 */
function S700Stage(props: Props) {
  const textProblem = props.boxes[manifest.box.B01];
  const qrProblem = props.boxes[manifest.box.B02];
  const presentationProblem = props.boxes[manifest.box.B03];
  const slot = useMemo<RemoteSlot>(() => {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    return remoteSlots[random % remoteSlots.length] ?? remoteSlots[0];
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const scanningRef = useRef(false);
  const segmentListenerRef = useRef<(() => void) | undefined>(undefined);
  const presentationRef = useRef<PresentationConnectionLike | undefined>(
    undefined,
  );
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [textPlayed, setTextPlayed] = useState(false);
  const [qrPlayed, setQrPlayed] = useState(false);
  const [key, setKey] = useState("");
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = undefined;
    if (cameraRef.current) cameraRef.current.srcObject = null;
  }, []);

  const cleanup = useCallback(() => {
    stopCamera();
    const video = videoRef.current;
    if (video) {
      if (segmentListenerRef.current)
        video.removeEventListener("timeupdate", segmentListenerRef.current);
      segmentListenerRef.current = undefined;
      video.pause();
      video.currentTime = 0;
      video.disableRemotePlayback = true;
    }
    const presentation = presentationRef.current;
    presentationRef.current = undefined;
    presentation?.terminate?.();
    if (!presentation?.terminate) presentation?.close();
  }, [stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const remote = (
      video as (HTMLVideoElement & { remote?: RemotePlaybackLike }) | null
    )?.remote;
    const connected = () => setRemoteConnected(remote?.state === "connected");
    remote?.addEventListener("connect", connected);
    remote?.addEventListener("disconnect", connected);
    const stop = () => cleanup();
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      remote?.removeEventListener("connect", connected);
      remote?.removeEventListener("disconnect", connected);
      void remote?.cancelWatchAvailability?.();
      props.signal.removeEventListener("abort", stop);
      cleanup();
    };
  }, [cleanup, props.signal]);

  const connectRemote = async () => {
    const video = videoRef.current;
    const remote = (
      video as (HTMLVideoElement & { remote?: RemotePlaybackLike }) | null
    )?.remote;
    if (!video || !remote?.prompt) {
      setStatus(stageText(props.locale, locale.remoteUnavailable));
      return;
    }
    video.disableRemotePlayback = false;
    try {
      await remote.prompt();
      const connected = remote.state === "connected";
      setRemoteConnected(connected);
      setStatus(
        stageText(
          props.locale,
          connected ? locale.remoteConnected : locale.remoteWaiting,
        ),
      );
    } catch {
      setStatus(stageText(props.locale, locale.cancelled));
    }
  };

  const playSegment = async (kind: "text" | "qr") => {
    const video = videoRef.current;
    const remote = (
      video as (HTMLVideoElement & { remote?: RemotePlaybackLike }) | null
    )?.remote;
    if (!video || remote?.state !== "connected") {
      setStatus(stageText(props.locale, locale.remoteRequired));
      return;
    }
    const start = kind === "text" ? 0 : 4;
    const end = kind === "text" ? 3.8 : 7.8;
    if (segmentListenerRef.current)
      video.removeEventListener("timeupdate", segmentListenerRef.current);
    video.currentTime = start;
    const reached = () => {
      if (video.currentTime < end) return;
      video.pause();
      video.removeEventListener("timeupdate", reached);
      segmentListenerRef.current = undefined;
      if (kind === "text") {
        setTextPlayed(true);
        setStatus(stageText(props.locale, locale.textShown));
      } else {
        setQrPlayed(true);
        setStatus(stageText(props.locale, locale.qrShown));
      }
    };
    segmentListenerRef.current = reached;
    video.addEventListener("timeupdate", reached);
    try {
      await video.play();
    } catch {
      video.removeEventListener("timeupdate", reached);
      segmentListenerRef.current = undefined;
      setStatus(stageText(props.locale, locale.cancelled));
    }
  };

  const submitKey = () => {
    const video = videoRef.current as
      | (HTMLVideoElement & { remote?: RemotePlaybackLike })
      | null;
    if (
      textPlayed &&
      video?.remote?.state === "connected" &&
      key.trim().toLowerCase() === slot.key
    ) {
      textProblem.solve();
      setStatus(stageText(props.locale, locale.textSolved));
    } else {
      setStatus(stageText(props.locale, locale.wrongKey));
    }
  };

  const scanQr = async () => {
    const Detector = (
      window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;
    const camera = cameraRef.current;
    const video = videoRef.current as
      | (HTMLVideoElement & { remote?: RemotePlaybackLike })
      | null;
    if (!Detector || !camera) {
      setStatus(stageText(props.locale, locale.barcodeUnavailable));
      return;
    }
    if (!qrPlayed || video?.remote?.state !== "connected") {
      setStatus(stageText(props.locale, locale.qrRequired));
      return;
    }
    const formats = await Detector.getSupportedFormats();
    if (!formats.includes("qr_code")) {
      setStatus(stageText(props.locale, locale.barcodeUnavailable));
      return;
    }
    stopCamera();
    scanningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      camera.srcObject = stream;
      await camera.play();
      const detector = new Detector({ formats: ["qr_code"] });
      const deadline = performance.now() + 15_000;
      while (scanningRef.current && performance.now() < deadline) {
        const value = (await detector.detect(camera))[0]?.rawValue;
        if (value === slot.token && video.remote?.state === "connected") {
          qrProblem.solve();
          setStatus(stageText(props.locale, locale.qrSolved));
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
    } catch {
      setStatus(stageText(props.locale, locale.cancelled));
    } finally {
      stopCamera();
    }
  };

  const startPresentation = async () => {
    const Request = (
      window as Window & {
        PresentationRequest?: new (urls: string[]) => PresentationRequestLike;
      }
    ).PresentationRequest;
    if (!Request) {
      setStatus(stageText(props.locale, locale.presentationUnavailable));
      return;
    }
    const round = crypto.randomUUID();
    const receiver = new URL("./presentation-receiver.html", document.baseURI);
    receiver.searchParams.set("round", round);
    try {
      const connection = await new Request([receiver.href]).start();
      presentationRef.current = connection;
      const onMessage = (event: Event) => {
        if ((event as MessageEvent<string>).data !== `ready:${round}`) return;
        connection.removeEventListener("message", onMessage);
        presentationProblem.solve();
        setStatus(stageText(props.locale, locale.presentationReady));
      };
      connection.addEventListener("message", onMessage);
      setStatus(stageText(props.locale, locale.presentationWaiting));
    } catch {
      setStatus(stageText(props.locale, locale.cancelled));
    }
  };

  const source = slotFiles[slot.id as keyof typeof slotFiles];
  return (
    <div className="puzzle puzzle--centered s700-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={textProblem} locale={props.locale} />
        <StageProblemGiftBox box={qrProblem} locale={props.locale} />
        <StageProblemGiftBox box={presentationProblem} locale={props.locale} />
      </div>
      <video
        ref={videoRef}
        className="s700-remote-source"
        src={source}
        preload="auto"
      >
        <track
          kind="captions"
          src="data:text/vtt,WEBVTT"
          srcLang="en"
          label="No captions"
        />
      </video>
      <div className="s700-panel-grid">
        <section>
          <p className="s700-panel-heading">
            {stageText(props.locale, locale.remoteHeading)}
          </p>
          <button
            type="button"
            className="stage-action"
            onClick={() => void connectRemote()}
          >
            {stageText(props.locale, locale.connectRemote)}
          </button>
          <button
            type="button"
            className="stage-action"
            disabled={!remoteConnected}
            onClick={() => void playSegment("text")}
          >
            {stageText(props.locale, locale.showText)}
          </button>
          <label className="stage-field">
            <span>{stageText(props.locale, locale.keyLabel)}</span>
            <input
              value={key}
              onChange={(event) => setKey(event.currentTarget.value)}
            />
          </label>
          <button type="button" className="stage-action" onClick={submitKey}>
            {stageText(props.locale, locale.submitKey)}
          </button>
          <button
            type="button"
            className="stage-action"
            disabled={!remoteConnected}
            onClick={() => void playSegment("qr")}
          >
            {stageText(props.locale, locale.showQr)}
          </button>
          <button
            type="button"
            className="stage-action"
            onClick={() => void scanQr()}
          >
            {stageText(props.locale, locale.scanQr)}
          </button>
          <video ref={cameraRef} className="s700-camera" muted playsInline>
            <track
              kind="captions"
              src="data:text/vtt,WEBVTT"
              srcLang="en"
              label="No captions"
            />
          </video>
        </section>
        <section>
          <p className="s700-panel-heading">
            {stageText(props.locale, locale.presentationHeading)}
          </p>
          <button
            type="button"
            className="stage-action"
            onClick={() => void startPresentation()}
          >
            {stageText(props.locale, locale.startPresentation)}
          </button>
        </section>
      </div>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DesktopWindowsOutlined,
      color: "#f59e0b",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: DevicesOutlined,
      color: "#22d3ee",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: DesktopWindowsOutlined,
      color: "#0ea5e9",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      ("PresentationRequest" in window ||
        "remote" in HTMLMediaElement.prototype)
        ? "permission-required"
        : "unsupported",
    ),
  Component: S700Stage,
});
