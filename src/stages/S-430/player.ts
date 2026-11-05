import { tracks } from "./tracks";

export const actionBoxes = {
  pause: "B01",
  play: "B03",
  stop: "B04",
  seekforward: "B05",
  seekbackward: "B06",
  previoustrack: "B07",
  nexttrack: "B08",
  seekto: "B09",
  enterpictureinpicture: "B10",
} as const;
export type Action = keyof typeof actionBoxes;
export type BoxId = (typeof actionBoxes)[Action] | "B02";
type Details = MediaSessionActionDetails & {
  enterPictureInPictureReason?: string;
};
type AudioSession = EventTarget & { type?: string; state?: string };
export interface PlayerState {
  status: string;
  track: number;
  paused: boolean;
  muted: boolean;
  position: number | null;
  duration: number | null;
  available: Partial<Record<BoxId, boolean>>;
}
interface Operation {
  controller: AbortController;
  valid(): boolean;
}
export function createPlayer(
  video: HTMLVideoElement,
  change: (state: PlayerState) => void,
  solve: (id: BoxId) => void,
  signal: AbortSignal,
) {
  const media = navigator.mediaSession;
  const audio = (navigator as Navigator & { audioSession?: AudioSession })
    .audioSession;
  const originalType = audio?.type;
  const available: Partial<Record<BoxId, boolean>> = {
    B02: Boolean(audio && typeof originalType === "string"),
  };
  const registered = new Set<Action>();
  const solved = new Set<BoxId>();
  let alive = true;
  let armed = false;
  let index = 0;
  let status = "idle";
  let stopped = true;
  let current: Operation | null = null;
  let seeking: {
    operation: Operation;
    action: "seekforward" | "seekbackward" | "seekto" | "stop";
    from: number;
    to: number;
  } | null = null;
  let pip: {
    operation: Operation;
    reason: string | undefined;
    entered: boolean;
    granted: boolean;
  } | null = null;
  let recovery: {
    started: boolean;
    interrupted: boolean;
    playing: boolean;
  } | null = null;
  video.volume = 0.4;
  if (video.src !== tracks[0].src) {
    video.src = tracks[0].src;
    video.load();
  }
  const sourceMatches = () => video.currentSrc === tracks[index]?.src;
  const loaded = () =>
    sourceMatches() &&
    video.readyState >= 2 &&
    Number.isFinite(video.duration) &&
    video.duration > 0;
  const playing = () => loaded() && !video.paused && !video.ended;
  const publish = () => {
    if (!alive) return;
    change({
      status,
      track: index,
      paused: video.paused,
      muted: video.muted,
      position:
        loaded() && Number.isFinite(video.currentTime)
          ? video.currentTime
          : null,
      duration: loaded() ? video.duration : null,
      available: { ...available },
    });
  };
  const award = (id: BoxId) => {
    if (alive && armed && !solved.has(id)) {
      solved.add(id);
      solve(id);
    }
  };
  const position = () => {
    if (!media || !armed) return;
    try {
      if (
        stopped ||
        !loaded() ||
        !Number.isFinite(video.currentTime) ||
        !Number.isFinite(video.playbackRate) ||
        video.playbackRate <= 0
      )
        media.setPositionState?.();
      else
        media.setPositionState?.({
          duration: video.duration,
          playbackRate: video.playbackRate,
          position: Math.max(0, Math.min(video.duration, video.currentTime)),
        });
    } catch {
      /* Position reporting is independent of action support. */
    }
  };
  const sync = () => {
    if (!alive) return;
    if (armed && media)
      media.playbackState =
        stopped || video.ended ? "none" : video.paused ? "paused" : "playing";
    position();
    publish();
  };
  const abortOperation = () => {
    current?.controller.abort();
    current = null;
    seeking = null;
    pip = null;
  };
  const operation = (): Operation => {
    abortOperation();
    const controller = new AbortController();
    const next: Operation = {
      controller,
      valid: () =>
        alive &&
        armed &&
        !signal.aborted &&
        !controller.signal.aborted &&
        current === next,
    };
    current = next;
    return next;
  };
  const fail = (error: unknown) => {
    if (alive) {
      status =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "error";
      publish();
    }
  };
  const exitPip = () => {
    if (document.pictureInPictureElement === video)
      void document.exitPictureInPicture?.().catch(() => {});
  };
  const play = async (op: Operation) => {
    try {
      await video.play();
      if (!alive) {
        video.pause();
        exitPip();
        return false;
      }
      if (!op.valid()) {
        if (stopped) video.pause();
        return false;
      }
      if (!playing()) {
        status = "error";
        publish();
        return false;
      }
      stopped = false;
      status = "playing";
      sync();
      return true;
    } catch (error) {
      if (op.valid()) fail(error);
      return false;
    }
  };
  const metadata = () => {
    if (!media) return;
    if (typeof MediaMetadata === "function")
      media.metadata = new MediaMetadata({
        title: `Busycube · ${tracks[index]?.name ?? ""}`,
        artist: "Busycube",
        artwork: [
          {
            src: new URL("/icon-192.png", location.href).href,
            sizes: "192x192",
            type: "image/png",
          },
        ],
      });
  };
  const recovered = () => {
    if (
      recovery?.started &&
      recovery.interrupted &&
      recovery.playing &&
      audio?.state === "active" &&
      playing()
    )
      award("B02");
  };
  const pipComplete = () => {
    const pending = pip;
    if (
      !pending?.operation.valid() ||
      !pending.granted ||
      !pending.entered ||
      document.pictureInPictureElement !== video
    )
      return;
    if (pending.reason === "useraction") award("B10");
    else {
      status =
        pending.reason === "contentoccluded" ? "pipAutomatic" : "pipUnknown";
      publish();
    }
    pip = null;
  };
  const onMedia = (event: Event) => {
    if (!alive) return;
    if (event.type === "playing") {
      stopped = false;
      status = "playing";
      if (event.isTrusted && recovery?.interrupted) {
        recovery.playing = true;
        recovered();
      }
    } else if (event.type === "pause") status = stopped ? "idle" : "paused";
    else if (event.type === "ended") {
      stopped = true;
      status = "idle";
    } else if (event.type === "error") {
      status = "error";
    }
    if (
      event.type === "seeked" &&
      event.isTrusted &&
      seeking?.operation.valid() &&
      loaded()
    ) {
      const pending = seeking;
      const actual = video.currentTime;
      const direction =
        pending.action === "seekforward"
          ? actual > pending.from
          : pending.action === "seekbackward"
            ? actual < pending.from
            : actual !== pending.from;
      if (
        Number.isFinite(actual) &&
        Math.abs(actual - pending.to) <= 0.3 &&
        (pending.action === "stop" ? video.paused && actual <= 0.03 : direction)
      ) {
        seeking = null;
        award(actionBoxes[pending.action]);
      }
    }
    if (
      event.type === "enterpictureinpicture" &&
      event.isTrusted &&
      pip?.operation.valid()
    ) {
      pip.entered = true;
      pipComplete();
    }
    sync();
  };
  const onAudio = (event: Event) => {
    if (!alive || !event.isTrusted || !recovery) return;
    if (audio?.state === "interrupted") {
      recovery.interrupted = true;
      recovery.playing = false;
      status = "interrupted";
    } else if (audio?.state === "active") {
      recovered();
      if (playing()) status = "playing";
    }
    publish();
  };
  const waitLoaded = (op: Operation) =>
    new Promise<void>((resolve, reject) => {
      const done = (cause?: unknown) => {
        clearTimeout(timer);
        video.removeEventListener("loadeddata", inspect);
        video.removeEventListener("error", failed);
        op.controller.signal.removeEventListener("abort", abort);
        if (cause) reject(cause);
        else resolve();
      };
      const inspect = () => {
        if (op.valid() && loaded()) done();
      };
      const abort = () => done(new DOMException("Aborted", "AbortError"));
      const failed = () => done(new Error("Media failed"));
      const timer = setTimeout(
        () => done(new Error("Media load timed out")),
        8_000,
      );
      video.addEventListener("loadeddata", inspect);
      video.addEventListener("error", failed);
      op.controller.signal.addEventListener("abort", abort, { once: true });
      if (!op.valid()) abort();
      else inspect();
    });
  const act = async (action: Action, details: Details) => {
    if (!alive || !armed || String(details.action) !== action) return;
    const op = operation();
    try {
      if (action === "play") {
        if (!video.paused && !video.ended) return;
        if (await play(op)) award("B03");
      } else if (action === "pause") {
        if (!playing()) return;
        video.pause();
        if (op.valid() && video.paused) {
          status = "paused";
          award("B01");
          sync();
        }
      } else if (action === "stop") {
        if (!loaded() || (video.paused && video.currentTime === 0)) return;
        const from = video.currentTime;
        recovery = null;
        stopped = true;
        video.pause();
        if (from > 0) {
          seeking = { operation: op, action, from, to: 0 };
          video.currentTime = 0;
        } else if (op.valid() && video.paused) award("B04");
        status = "idle";
        sync();
      } else if (
        action === "seekforward" ||
        action === "seekbackward" ||
        action === "seekto"
      ) {
        if (!loaded() || !Number.isFinite(video.currentTime)) return;
        const from = video.currentTime;
        let to: number;
        if (action === "seekto") {
          if (
            typeof details.seekTime !== "number" ||
            !Number.isFinite(details.seekTime) ||
            details.seekTime < 0
          )
            return;
          to = Math.min(video.duration, details.seekTime);
        } else {
          const offset =
            details.seekOffset === undefined ? 5 : details.seekOffset;
          if (
            typeof offset !== "number" ||
            !Number.isFinite(offset) ||
            offset <= 0
          )
            return;
          to = Math.max(
            0,
            Math.min(
              video.duration,
              from + (action === "seekforward" ? offset : -offset),
            ),
          );
        }
        if (to === from) return;
        seeking = { operation: op, action, from, to };
        video.currentTime = to;
      } else if (action === "previoustrack" || action === "nexttrack") {
        const wasPlaying = !video.paused && !video.ended;
        index =
          (index + (action === "nexttrack" ? 1 : tracks.length - 1)) %
          tracks.length;
        const next = tracks[index];
        if (!next) return;
        video.src = next.src;
        video.load();
        metadata();
        await waitLoaded(op);
        if (!op.valid() || !loaded()) return;
        if (wasPlaying && !(await play(op))) return;
        if (!wasPlaying) {
          stopped = false;
          status = "paused";
        }
        award(actionBoxes[action]);
        sync();
      } else {
        if (!loaded() || document.pictureInPictureElement === video) return;
        if (
          !video.requestPictureInPicture ||
          document.pictureInPictureEnabled === false
        ) {
          available.B10 = false;
          status = "unavailable";
          publish();
          return;
        }
        pip = {
          operation: op,
          reason: details.enterPictureInPictureReason,
          entered: false,
          granted: false,
        };
        await video.requestPictureInPicture();
        if (!alive) {
          exitPip();
          return;
        }
        if (!op.valid()) {
          if (!pip) exitPip();
          return;
        }
        if (!pip) return;
        pip.granted = true;
        pipComplete();
      }
    } catch (error) {
      if (op.valid()) fail(error);
    }
  };
  const register = () => {
    for (const action of Object.keys(actionBoxes) as Action[]) {
      if (registered.has(action)) continue;
      if (!media) {
        available[actionBoxes[action]] = false;
        continue;
      }
      try {
        // lib.dom omits the newer enterpictureinpicture action and reason field.
        media.setActionHandler(action as MediaSessionAction, (details) => {
          void act(action, details as Details);
        });
        registered.add(action);
        available[actionBoxes[action]] = true;
      } catch {
        available[actionBoxes[action]] = false;
      }
    }
  };
  const start = async (kind: Action | "recovery") => {
    if (!alive || signal.aborted) return;
    if (kind === "recovery" && !available.B02) {
      status = "unavailable";
      publish();
      return;
    }
    register();
    if (kind !== "recovery" && !registered.has(kind)) {
      status = "unavailable";
      publish();
      return;
    }
    armed = true;
    recovery =
      kind === "recovery"
        ? { started: false, interrupted: false, playing: false }
        : null;
    if (audio && typeof originalType === "string") {
      try {
        audio.type = "playback";
      } catch {
        available.B02 = false;
        if (kind === "recovery") {
          recovery = null;
          status = "unavailable";
          publish();
          return;
        }
      }
    }
    const op = operation();
    metadata();
    status = "waiting";
    publish();
    if (await play(op)) {
      if (recovery) {
        recovery.started = true;
        recovered();
      }
    } else if (op.valid()) recovery = null;
  };
  const stop = () => {
    if (!alive) return;
    abortOperation();
    recovery = null;
    stopped = true;
    video.pause();
    try {
      if (loaded()) video.currentTime = 0;
    } catch {}
    exitPip();
    status = "idle";
    sync();
  };
  const events = [
    "playing",
    "pause",
    "ended",
    "timeupdate",
    "durationchange",
    "loadedmetadata",
    "ratechange",
    "volumechange",
    "seeked",
    "error",
    "enterpictureinpicture",
    "leavepictureinpicture",
  ];
  for (const name of events) video.addEventListener(name, onMedia);
  audio?.addEventListener("statechange", onAudio);
  const dispose = () => {
    if (!alive) return;
    alive = false;
    abortOperation();
    recovery = null;
    for (const name of events) video.removeEventListener(name, onMedia);
    audio?.removeEventListener("statechange", onAudio);
    for (const action of registered) {
      try {
        media?.setActionHandler(action as MediaSessionAction, null);
      } catch {}
    }
    if (media && armed) {
      media.metadata = null;
      media.playbackState = "none";
      try {
        media.setPositionState?.();
      } catch {}
    }
    if (audio && typeof originalType === "string") {
      try {
        audio.type = originalType;
      } catch {}
    }
    video.pause();
    exitPip();
    video.removeAttribute("src");
    video.load();
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) dispose();
  else publish();
  return {
    start,
    stop,
    mute: () => {
      if (alive) {
        video.muted = !video.muted;
        publish();
      }
    },
    dispose,
  };
}
