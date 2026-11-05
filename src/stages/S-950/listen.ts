import { cents, estimatePitch, PitchHold, strings } from "./pitch";

export interface GuitarState {
  status: string;
  running: boolean;
  nearest: number | null;
  alignment: number;
}
interface Attempt {
  active: boolean;
  context: AudioContext | null;
  stream: MediaStream | null;
  source: MediaStreamAudioSourceNode | null;
  analyser: AnalyserNode | null;
  frame: number | null;
  remove: () => void;
}
export function guitar(
  signal: AbortSignal,
  changed: (state: GuitarState) => void,
  solve: (index: number) => void,
) {
  let current: Attempt | null = null,
    alive = true;
  const solved = new Set<number>();
  const valid = (a: Attempt) =>
    alive && !signal.aborted && a.active && current === a;
  const state = (
    status: string,
    running: boolean,
    nearest: number | null = null,
    alignment = 0,
  ) => {
    if (alive && !signal.aborted)
      changed({ status, running, nearest, alignment });
  };
  const close = (a: Attempt) => {
    if (!a.active) return;
    a.active = false;
    if (current === a) current = null;
    if (a.frame !== null) cancelAnimationFrame(a.frame);
    a.remove();
    for (const track of a.stream?.getTracks() ?? []) track.stop();
    a.source?.disconnect();
    a.analyser?.disconnect();
    if (a.context && a.context.state !== "closed")
      void a.context.close().catch(() => {});
  };
  const stop = () => {
    if (current) close(current);
    state("released", false);
  };
  const start = async () => {
    if (!alive || signal.aborted || current) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      state("unavailable", false);
      return;
    }
    const a: Attempt = {
      active: true,
      context: null,
      stream: null,
      source: null,
      analyser: null,
      frame: null,
      remove: () => {},
    };
    current = a;
    state("waiting", true);
    try {
      const context = new AudioContext({ latencyHint: "interactive" });
      a.context = context;
      const resumed = context.resume().then(
        () => ({ ok: true as const }),
        () => ({ ok: false as const }),
      );
      const received = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: { ideal: false },
          echoCancellation: { ideal: false },
          noiseSuppression: { ideal: false },
          channelCount: { ideal: 1 },
        },
        video: false,
      });
      if (!valid(a)) {
        for (const track of received.getTracks()) track.stop();
        return;
      }
      a.stream = received;
      const track = received
        .getAudioTracks()
        .find((candidate) => candidate.readyState === "live");
      if (!track || !(await resumed).ok || context.state !== "running")
        throw new Error("No running microphone");
      if (!valid(a)) return;
      const source = context.createMediaStreamSource(received),
        analyser = context.createAnalyser();
      a.source = source;
      a.analyser = analyser;
      analyser.fftSize = 8192;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize),
        gate = new PitchHold();
      let previous = -Infinity;
      const ended = () => {
        if (valid(a)) {
          close(a);
          state("error", false);
        }
      };
      const hidden = () => {
        if (document.hidden && valid(a)) {
          close(a);
          state("released", false);
        }
      };
      track.addEventListener("ended", ended);
      document.addEventListener("visibilitychange", hidden);
      a.remove = () => {
        track.removeEventListener("ended", ended);
        document.removeEventListener("visibilitychange", hidden);
      };
      const sample = (time: number) => {
        if (!valid(a)) return;
        if (document.hidden) {
          hidden();
          return;
        }
        if (time - previous >= 50) {
          previous = time;
          try {
            if (
              context.state !== "running" ||
              track.muted ||
              track.readyState !== "live"
            ) {
              gate.reset();
              state("waiting", true);
            } else {
              analyser.getFloatTimeDomainData(samples);
              const frequency = estimatePitch(samples, context.sampleRate);
              const distances = strings.map((string) =>
                frequency
                  ? Math.abs(cents(frequency, string.frequency))
                  : Infinity,
              );
              const distance = Math.min(...distances),
                nearest = Number.isFinite(distance)
                  ? distances.indexOf(distance)
                  : null;
              const alignment = Number.isFinite(distance)
                ? Math.max(0, 1 - distance / 100)
                : 0;
              state("active", true, nearest, alignment);
              const index = gate.observe(frequency, context.currentTime * 1000);
              if (index !== null && !solved.has(index)) {
                solved.add(index);
                solve(index);
              }
              if (solved.size === strings.length) {
                close(a);
                state("success", false);
                return;
              }
            }
          } catch {
            close(a);
            state("error", false);
            return;
          }
        }
        a.frame = requestAnimationFrame(sample);
      };
      state("active", true);
      a.frame = requestAnimationFrame(sample);
    } catch (error) {
      if (valid(a)) {
        close(a);
        state(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "denied"
            : "unavailable",
          false,
        );
      }
    }
  };
  const dispose = () => {
    if (!alive) return;
    if (current) close(current);
    alive = false;
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) dispose();
  return { start, stop, dispose };
}
