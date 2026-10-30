import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import {
  BlobSource,
  BufferTarget,
  Conversion,
  HLS_FORMATS,
  Input,
  MATROSKA,
  MP4,
  OGG,
  Output,
  QTFF,
  WEBM,
  WebMOutputFormat,
} from "mediabunny";
import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { decodeQrCanvas } from "../../media/qrDecoder";
import { type S710LayoutMessage, s710Flags } from "../../stages/S-710/protocol";
import { drawQrIntoQuad } from "../../stages/S-710/qr";
import { toolCopy } from "./locale";
import "./styles.css";

class DecodeFailure extends Error {}

const samples = [
  {
    name: "A",
    url: new URL(
      "../../fixtures/s710/assets/dark-frame-input.webm",
      import.meta.url,
    ).href,
  },
  {
    name: "B",
    url: new URL(
      "../../fixtures/s710/assets/qr-frame-input.webm",
      import.meta.url,
    ).href,
  },
  {
    name: "C",
    url: new URL(
      "../../fixtures/s710/assets/incomplete-input.webm?no-inline",
      import.meta.url,
    ).href,
  },
] as const;

function drawMessage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  message: string,
) {
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const maxWidth = width * 0.94;
  const maxHeight = height * 0.7;
  const baseSize = 100;
  context.font = `bold ${baseSize}px sans-serif`;
  const measuredWidth = context.measureText(message).width;
  const fontSize = Math.max(
    16,
    Math.floor(
      baseSize *
        Math.min(maxWidth / Math.max(1, measuredWidth), maxHeight / baseSize),
    ),
  );
  context.font = `bold ${fontSize}px sans-serif`;
  context.fillText(message, width / 2, height / 2);
}

function isDarkFrame(image: ImageData) {
  for (let index = 0; index < image.data.length; index += 4)
    if (
      (image.data[index] ?? 255) > 0x10 ||
      (image.data[index + 1] ?? 255) > 0x10 ||
      (image.data[index + 2] ?? 255) > 0x10
    )
      return false;
  return true;
}

function revoke(url: string | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function Tool() {
  const locale =
    new URL(location.href).searchParams.get("locale") === "ja" ? "ja" : "en";
  const copy = toolCopy(locale);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = copy.documentTitle;
  }, [copy.documentTitle, locale]);
  const [source, setSource] = useState<File>();
  const [outputUrl, setOutputUrl] = useState<string>();
  const [outputSize, setOutputSize] = useState<number>();
  const [status, setStatus] = useState(copy.initial);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number>();
  const [recordingStream, setRecordingStream] = useState<MediaStream>();
  const recordingVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const alive = useRef(true);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const conversionRef = useRef<Conversion | undefined>(undefined);
  const inputRef = useRef<Input | undefined>(undefined);
  const loadingRef = useRef<AbortController | undefined>(undefined);
  const outputBlob = useRef<Blob | undefined>(undefined);
  const recordingTimerRef = useRef<number | undefined>(undefined);
  const recordingIntervalRef = useRef<number | undefined>(undefined);
  const session = useMemo(
    () => new URL(location.href).searchParams.get("session") ?? "",
    [],
  );
  const brokenOutput = new URL(
    "../../fixtures/s710/assets/decode-failure-output.webm?no-inline",
    import.meta.url,
  ).href;
  const sourceUrl = useMemo(
    () => (source ? URL.createObjectURL(source) : undefined),
    [source],
  );

  useEffect(() => {
    let frame: number | undefined;
    const publishHeight = () => {
      frame = undefined;
      const message: S710LayoutMessage = {
        channel: "busycube-s710-tool",
        height: Math.ceil(
          Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
          ),
        ),
        session,
        type: "layout",
      };
      parent.postMessage(message, location.origin);
    };
    const schedule = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(publishHeight);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [session]);

  useEffect(() => () => revoke(sourceUrl), [sourceUrl]);
  useEffect(() => () => revoke(outputUrl), [outputUrl]);
  useEffect(() => {
    alive.current = true;
    const release = () => {
      alive.current = false;
      loadingRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = undefined;
      void conversionRef.current?.cancel().catch(() => undefined);
      inputRef.current?.dispose();
      outputBlob.current = undefined;
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (recordingIntervalRef.current)
        clearInterval(recordingIntervalRef.current);
    };
    window.addEventListener("pagehide", release);
    return () => {
      release();
      window.removeEventListener("pagehide", release);
    };
  }, []);
  useEffect(() => {
    const video = recordingVideoRef.current;
    if (!video) return;
    video.srcObject = recordingStream ?? null;
    if (recordingStream) void video.play().catch(() => undefined);
    return () => {
      if (video.srcObject === recordingStream) video.srcObject = null;
    };
  }, [recordingStream]);
  useEffect(
    () => () => {
      if (recordingTimerRef.current)
        window.clearTimeout(recordingTimerRef.current);
      if (recordingIntervalRef.current)
        window.clearInterval(recordingIntervalRef.current);
    },
    [],
  );

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const record = async () => {
    if (busy || !alive.current) return;
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15 },
        },
        audio: false,
      });
      if (!alive.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = undefined;
        if (!alive.current) return;
        setSource(
          new File(chunks, "camera.webm", {
            type: recorder.mimeType || "video/webm",
          }),
        );
        setRecordingStream(undefined);
        setRecording(false);
        setCountdown(undefined);
        if (recordingIntervalRef.current)
          window.clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = undefined;
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = undefined;
        recorderRef.current = undefined;
        setBusy(false);
        setStatus(copy.cameraReady);
      };
      setRecordingStream(stream);
      setBusy(true);
      setRecording(true);
      setCountdown(10);
      recorder.start();
      const startedAt = performance.now();
      recordingIntervalRef.current = window.setInterval(() => {
        setCountdown(
          Math.max(0, 10 - Math.ceil((performance.now() - startedAt) / 1000)),
        );
      }, 200);
      recordingTimerRef.current = window.setTimeout(
        () => stopRecording(),
        10_000,
      );
    } catch {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = undefined;
      if (!alive.current) return;
      setBusy(false);
      setRecording(false);
      setCountdown(undefined);
      setStatus(copy.cameraUnavailable);
    }
  };

  const transform = async () => {
    if (!source || busy || !alive.current) return;
    setBusy(true);
    setStatus(copy.compressing);
    let conversion: Conversion | undefined;
    try {
      const input = new Input({
        source: new BlobSource(source),
        // video trackは必須だが、HLSのsegment読込に必要な音声形式は保持する。
        formats: [MP4, QTFF, MATROSKA, WEBM, OGG, ...HLS_FORMATS],
      });
      inputRef.current = input;
      let readable = false;
      try {
        readable =
          (await input.canRead()) &&
          Boolean(await input.getPrimaryVideoTrack());
      } catch {
        throw new DecodeFailure("input cannot be decoded");
      }
      if (!readable) throw new DecodeFailure("input cannot be decoded");
      const tags = await input.getMetadataTags().catch(() => undefined);
      if (!alive.current) return;
      const secondPass = tags?.raw?.BUSYCUBE_TRANSFORMER === "S710_V1";
      const target = new BufferTarget();
      const output = new Output({ format: new WebMOutputFormat(), target });
      const frameCanvas = document.createElement("canvas");
      const scanCanvas = document.createElement("canvas");
      conversion = await Conversion.init({
        input,
        output,
        trim: { start: 0, end: 10 },
        video: {
          frameRate: 15,
          width: 640,
          height: 360,
          fit: "contain",
          codec: "vp8",
          bitrate: 160_000,
          process: async (sample) => {
            frameCanvas.width = sample.displayWidth;
            frameCanvas.height = sample.displayHeight;
            const context = frameCanvas.getContext("2d", {
              willReadFrequently: true,
            });
            if (!context) return sample;
            sample.draw(context, 0, 0, frameCanvas.width, frameCanvas.height);
            const image = context.getImageData(
              0,
              0,
              frameCanvas.width,
              frameCanvas.height,
            );
            if (isDarkFrame(image)) {
              drawMessage(
                context,
                frameCanvas.width,
                frameCanvas.height,
                s710Flags.dark,
              );
            }
            scanCanvas.width = Math.max(1, Math.floor(frameCanvas.width / 2));
            scanCanvas.height = Math.max(1, Math.floor(frameCanvas.height / 2));
            scanCanvas
              .getContext("2d")
              ?.drawImage(
                frameCanvas,
                0,
                0,
                scanCanvas.width,
                scanCanvas.height,
              );
            const decoded = decodeQrCanvas(scanCanvas);
            if (decoded) {
              const scaleX = frameCanvas.width / scanCanvas.width;
              const scaleY = frameCanvas.height / scanCanvas.height;
              const scalePoint = (point: { x: number; y: number }) => ({
                x: point.x * scaleX,
                y: point.y * scaleY,
              });
              const qrQuad: Parameters<typeof drawQrIntoQuad>[1] = [
                scalePoint(decoded.location.topLeftCorner),
                scalePoint(decoded.location.topRightCorner),
                scalePoint(decoded.location.bottomRightCorner),
                scalePoint(decoded.location.bottomLeftCorner),
              ];
              drawQrIntoQuad(context, qrQuad, s710Flags.qr);
            }
            if (secondPass)
              drawMessage(
                context,
                frameCanvas.width,
                frameCanvas.height,
                s710Flags.second,
              );
            return frameCanvas;
          },
        },
        audio: { discard: true },
        tags: { raw: { BUSYCUBE_TRANSFORMER: "S710_V1" } },
      });
      conversionRef.current = conversion;
      if (!alive.current) return;
      const decodeDiscarded = conversion.discardedTracks.some(
        ({ reason }) =>
          reason === "unknown_source_codec" ||
          reason === "undecodable_source_codec",
      );
      if (!conversion.isValid && decodeDiscarded)
        throw new DecodeFailure("input codec cannot be decoded");
      if (!conversion.isValid)
        throw new Error("compatible encoder unavailable");
      await conversion.execute();
      if (!alive.current) return;
      if (!target.buffer) throw new Error("output buffer unavailable");
      const blob = new Blob([target.buffer], { type: "video/webm" });
      outputBlob.current = blob;
      const nextUrl = URL.createObjectURL(blob);
      setOutputUrl(nextUrl);
      setOutputSize(blob.size);
      setStatus(
        `${copy.done}: ${(blob.size / Math.max(1, source.size)).toFixed(2)}×.`,
      );
    } catch (error) {
      if (!alive.current) return;
      if (error instanceof DecodeFailure) {
        const rescue = new AbortController();
        loadingRef.current = rescue;
        try {
          const response = await fetch(brokenOutput, { signal: rescue.signal });
          if (!response.ok) throw new Error("Recovery unavailable");
          const blob = await response.blob();
          if (!alive.current || rescue.signal.aborted) return;
          setOutputUrl(brokenOutput);
          outputBlob.current = blob;
          setOutputSize(blob.size);
          setStatus(copy.inputDecodeFailed);
        } catch {
          if (alive.current && !rescue.signal.aborted)
            setStatus(copy.conversionFailed);
        } finally {
          if (loadingRef.current === rescue) loadingRef.current = undefined;
        }
      } else {
        setStatus(
          `${copy.conversionFailed}: ${error instanceof Error ? error.message : copy.unknownError}`,
        );
      }
    } finally {
      await conversion?.cancel().catch(() => undefined);
      inputRef.current?.dispose();
      inputRef.current = undefined;
      conversionRef.current = undefined;
      if (alive.current) setBusy(false);
    }
  };

  const loadInput = async (url: string, name: string) => {
    if (busy || !alive.current) return;
    const controller = new AbortController();
    loadingRef.current?.abort();
    loadingRef.current = controller;
    setBusy(true);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Input unavailable");
      const blob = await response.blob();
      if (!alive.current || controller.signal.aborted) return;
      setSource(new File([blob], name, { type: "video/webm" }));
      setStatus(copy.inputReady);
    } catch {
      if (alive.current && !controller.signal.aborted)
        setStatus(copy.conversionFailed);
    } finally {
      if (loadingRef.current === controller) {
        loadingRef.current = undefined;
        if (alive.current) setBusy(false);
      }
    }
  };
  const reuseOutput = () => {
    if (busy || !alive.current || !outputBlob.current) return;
    // Reuse the actual generated bytes directly; fetching a blob URL would
    // unnecessarily depend on connect-src permissions.
    setSource(
      new File([outputBlob.current], "clippress-compressed.webm", {
        type: "video/webm",
      }),
    );
    setStatus(copy.inputReady);
  };

  return (
    <main>
      <header>
        <div>
          <strong>{copy.clipPress}</strong>
          <span>{copy.localCompressor}</span>
        </div>
        <span className="privacy">{copy.runsInBrowser}</span>
      </header>
      <div className="workspace">
        <section className="pane">
          <h1>{copy.input}</h1>
          <fieldset className="samples">
            <legend>{copy.samples}</legend>
            {samples.map((sample) => (
              <span key={sample.name}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void loadInput(
                      sample.url,
                      `clip-${sample.name.toLowerCase()}.webm`,
                    )
                  }
                >
                  {sample.name}
                </button>
                <a
                  href={sample.url}
                  download={`clip-${sample.name.toLowerCase()}.webm`}
                  aria-label={`${copy.download} ${sample.name}`}
                >
                  ↓
                </a>
              </span>
            ))}
          </fieldset>
          <label className="dropzone">
            <span>{copy.chooseVideo}</span>
            <input
              type="file"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                setSource(file);
                setStatus(
                  file.type.startsWith("video/")
                    ? copy.inputReady
                    : copy.unknownFile,
                );
              }}
            />
          </label>
          <div className="buttons">
            <button type="button" onClick={() => void record()} disabled={busy}>
              {copy.record10s}
            </button>
            {recording ? (
              <button type="button" onClick={stopRecording}>
                {copy.stop}
              </button>
            ) : null}
            {recording ? (
              <output className="recording-indicator">
                ● REC {countdown ?? 0}s
              </output>
            ) : null}
          </div>
          {recordingStream || sourceUrl ? (
            <video ref={recordingVideoRef} controls muted src={sourceUrl}>
              <track
                kind="captions"
                src="data:text/vtt,WEBVTT"
                srcLang="en"
                label={copy.inputTrack}
              />
            </video>
          ) : (
            <div className="empty">{copy.noInput}</div>
          )}
        </section>
        <button
          className="compress"
          type="button"
          onClick={() => void transform()}
          disabled={!source || busy}
        >
          {copy.compress}
        </button>
        <section className="pane">
          <h1>{copy.output}</h1>
          {outputUrl ? (
            <video controls src={outputUrl}>
              <track
                kind="captions"
                src="data:text/vtt,WEBVTT"
                srcLang="en"
                label={copy.outputTrack}
              />
            </video>
          ) : (
            <div className="empty">{copy.outputPreview}</div>
          )}
          <p>
            {source?.size.toLocaleString() ?? "—"} B →{" "}
            {outputSize?.toLocaleString() ?? "—"} B
          </p>
          {outputUrl ? (
            <div className="output-actions">
              <button
                type="button"
                disabled={busy}
                aria-label={copy.reuseOutput}
                onClick={reuseOutput}
              >
                <KeyboardReturnOutlined aria-hidden="true" />
              </button>
              <a
                className="download"
                href={outputUrl}
                download="clippress-compressed.webm"
              >
                {copy.download}
              </a>
            </div>
          ) : null}
        </section>
      </div>
      <footer>
        <span role="status">{status}</span>
      </footer>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("tool root unavailable");
createRoot(root).render(
  <StrictMode>
    <Tool />
  </StrictMode>,
);
