// @vitest-environment jsdom
import {
  type Action,
  actionBoxes,
  createPlayer,
  type PlayerState,
} from "./player";
import { tracks } from "./tracks";

function fixture(unsupported?: Action) {
  const listeners = new Map<string, Set<EventListener>>();
  const audioListeners = new Set<EventListener>();
  const emit = (type: string, isTrusted = true) => {
    for (const callback of listeners.get(type) ?? [])
      callback({ type, isTrusted } as Event);
  };
  const video = {
    src: tracks[0].src,
    currentSrc: tracks[0].src,
    readyState: 4,
    duration: 45,
    currentTime: 0,
    playbackRate: 1,
    volume: 1,
    paused: true,
    ended: false,
    muted: false,
    play: vi.fn(async () => {
      video.paused = false;
      emit("playing");
    }),
    pause: vi.fn(() => {
      video.paused = true;
      emit("pause");
    }),
    load: vi.fn(() => {
      video.currentSrc = video.src;
      video.currentTime = 0;
      video.paused = true;
    }),
    removeAttribute: vi.fn(() => {
      video.src = "";
    }),
    requestPictureInPicture: vi.fn(async () => {
      Reflect.set(document, "pictureInPictureElement", video);
      emit("enterpictureinpicture");
      return {} as PictureInPictureWindow;
    }),
    addEventListener: (name: string, callback: EventListener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)?.add(callback);
    },
    removeEventListener: (name: string, callback: EventListener) =>
      listeners.get(name)?.delete(callback),
  };
  const handlers = new Map<
    string,
    (details: Record<string, unknown>) => void
  >();
  const media = {
    metadata: null,
    playbackState: "none",
    setPositionState: vi.fn(),
    setActionHandler: vi.fn(
      (
        action: string,
        callback: ((details: Record<string, unknown>) => void) | null,
      ) => {
        if (action === unsupported)
          throw new DOMException("Unsupported", "NotSupportedError");
        if (callback) handlers.set(action, callback);
        else handlers.delete(action);
      },
    ),
  };
  const audio = {
    type: "auto",
    state: "active",
    addEventListener: (_name: string, callback: EventListener) =>
      audioListeners.add(callback),
    removeEventListener: (_name: string, callback: EventListener) =>
      audioListeners.delete(callback),
  };
  vi.stubGlobal("navigator", { mediaSession: media, audioSession: audio });
  vi.stubGlobal(
    "MediaMetadata",
    class {
      constructor(public value: unknown) {}
    },
  );
  Object.defineProperty(document, "pictureInPictureElement", {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, "pictureInPictureEnabled", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(document, "exitPictureInPicture", {
    value: vi.fn(async () =>
      Reflect.set(document, "pictureInPictureElement", null),
    ),
    configurable: true,
  });
  const controller = new AbortController();
  const solve = vi.fn();
  let state: PlayerState | undefined;
  const player = createPlayer(
    video as unknown as HTMLVideoElement,
    (next) => {
      state = next;
    },
    solve,
    controller.signal,
  );
  const flush = async () => {
    for (let n = 0; n < 8; n++) await Promise.resolve();
  };
  const action = async (name: Action, extra: Record<string, unknown> = {}) => {
    handlers.get(name)?.({ action: name, ...extra });
    await flush();
  };
  const audioState = (value: string, isTrusted = true) => {
    audio.state = value;
    for (const callback of audioListeners)
      callback({ type: "statechange", isTrusted } as Event);
  };
  return {
    player,
    video,
    media,
    audio,
    solve,
    action,
    emit,
    audioState,
    controller,
    handlers,
    listeners,
    audioListeners,
    flush,
    state: () => state,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const key of [
    "pictureInPictureElement",
    "pictureInPictureEnabled",
    "exitPictureInPicture",
  ])
    Reflect.deleteProperty(document, key);
});

it("requires external callbacks and actual playback changes; page controls and duplicate actions never add clears", async () => {
  const f = fixture();
  expect(f.media.setActionHandler).not.toHaveBeenCalled();
  await f.player.start("pause");
  expect(f.handlers.size).toBe(9);
  expect(f.solve).not.toHaveBeenCalled();
  await f.action("play");
  expect(f.solve).not.toHaveBeenCalled();
  await f.action("pause");
  expect(f.solve).toHaveBeenLastCalledWith("B01");
  expect(f.video.paused).toBe(true);
  await f.action("play");
  expect(f.solve).toHaveBeenLastCalledWith("B03");
  expect(f.media.playbackState).toBe("playing");
  f.video.currentTime = 12;
  await f.action("stop");
  expect(f.solve).toHaveBeenCalledTimes(2);
  expect(f.video.currentTime).toBe(0);
  f.emit("seeked", false);
  expect(f.solve).toHaveBeenCalledTimes(2);
  f.emit("seeked");
  expect(f.solve).toHaveBeenLastCalledWith("B04");
  expect(f.media.playbackState).toBe("none");
  f.player.mute();
  f.player.stop();
  f.emit("playing");
  f.emit("seeked");
  expect(f.solve).toHaveBeenCalledTimes(3);
  f.player.dispose();
});

it("uses supplied seek offsets, fallback only when omitted, actual trusted seek completion and real position state", async () => {
  const f = fixture();
  await f.player.start("seekforward");
  f.video.currentTime = 10;
  for (const seekOffset of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null])
    await f.action("seekforward", { seekOffset });
  expect(f.video.currentTime).toBe(10);
  expect(f.solve).not.toHaveBeenCalled();
  await f.action("seekforward", { seekOffset: 7 });
  expect(f.video.currentTime).toBe(17);
  f.emit("seeked", false);
  expect(f.solve).not.toHaveBeenCalled();
  f.emit("seeked");
  expect(f.solve).toHaveBeenLastCalledWith("B05");
  await f.action("seekbackward");
  expect(f.video.currentTime).toBe(12);
  f.emit("seeked");
  expect(f.solve).toHaveBeenLastCalledWith("B06");
  await f.action("seekto", { seekTime: Number.NaN });
  expect(f.video.currentTime).toBe(12);
  await f.action("seekto", { seekTime: 23 });
  f.emit("seeked");
  expect(f.solve).toHaveBeenLastCalledWith("B09");
  expect(f.media.setPositionState).toHaveBeenLastCalledWith({
    duration: 45,
    playbackRate: 1,
    position: 23,
  });
  f.player.dispose();
});

it("changes real sources and metadata for both playlist directions and waits for usable media", async () => {
  const f = fixture();
  await f.player.start("nexttrack");
  f.video.readyState = 0;
  await f.action("nexttrack");
  expect(f.video.src).toBe(tracks[1].src);
  expect(f.solve).not.toHaveBeenCalled();
  f.video.readyState = 4;
  f.emit("loadeddata");
  await f.flush();
  expect(f.solve).toHaveBeenLastCalledWith("B08");
  expect(f.video.paused).toBe(false);
  expect(JSON.stringify(f.media.metadata)).toContain("B");
  await f.action("pause");
  await f.action("previoustrack");
  expect(f.video.src).toBe(tracks[0].src);
  expect(f.video.paused).toBe(true);
  expect(f.solve).toHaveBeenLastCalledWith("B07");
  expect(f.media.playbackState).toBe("paused");
  f.player.dispose();
});

it.each(["useraction", "contentoccluded", undefined])(
  "requires a Media Session request plus actual PiP entry, preserving reason %s",
  async (reason) => {
    const f = fixture();
    await f.player.start("enterpictureinpicture");
    Reflect.set(document, "pictureInPictureElement", f.video);
    f.emit("enterpictureinpicture");
    expect(f.solve).not.toHaveBeenCalled();
    Reflect.set(document, "pictureInPictureElement", null);
    await f.action("enterpictureinpicture", {
      enterPictureInPictureReason: reason,
    });
    expect(f.video.requestPictureInPicture).toHaveBeenCalledOnce();
    if (reason === "useraction") expect(f.solve).toHaveBeenCalledWith("B10");
    else {
      expect(f.solve).not.toHaveBeenCalled();
      expect(f.state()?.status).toBe(reason ? "pipAutomatic" : "pipUnknown");
    }
    f.player.dispose();
    expect(document.exitPictureInPicture).toHaveBeenCalledOnce();
  },
);

it.each([true, false])(
  "requires interrupted then active and actual resumed playing, regardless of active/playing order %s",
  async (activeFirst) => {
    const f = fixture();
    await f.player.start("recovery");
    await f.action("pause");
    await f.action("play");
    expect(f.solve).not.toHaveBeenCalledWith("B02");
    f.audioState("interrupted", false);
    f.audioState("active");
    f.emit("playing");
    expect(f.solve).not.toHaveBeenCalledWith("B02");
    f.audioState("interrupted");
    f.video.paused = true;
    if (activeFirst) f.audioState("active");
    f.video.paused = false;
    f.emit("playing", false);
    expect(f.solve).not.toHaveBeenCalledWith("B02");
    f.emit("playing");
    if (!activeFirst) {
      expect(f.solve).not.toHaveBeenCalledWith("B02");
      f.audioState("active");
    }
    expect(f.solve).toHaveBeenLastCalledWith("B02");
    f.player.dispose();
  },
);

it("isolates unsupported actions and restores handlers, audio type, metadata, source and listeners on leave", async () => {
  const f = fixture("enterpictureinpicture");
  await f.player.start("pause");
  expect(f.state()?.available.B10).toBe(false);
  expect(f.audio.type).toBe("playback");
  await f.action("pause");
  expect(f.solve).toHaveBeenCalledWith("B01");
  f.controller.abort();
  expect(f.handlers.size).toBe(0);
  expect(f.audio.type).toBe("auto");
  expect(f.media.metadata).toBeNull();
  expect(f.video.src).toBe("");
  expect(f.video.paused).toBe(true);
  expect([...f.listeners.values()].every((set) => set.size === 0)).toBe(true);
  expect(f.audioListeners.size).toBe(0);
  f.emit("playing");
  await f.player.start("play");
  expect(f.solve).toHaveBeenCalledTimes(1);
});

it("aborts an unfinished source load, and never clears on a late or failed play", async () => {
  vi.useFakeTimers();
  const f = fixture();
  await f.player.start("nexttrack");
  f.video.readyState = 0;
  await f.action("nexttrack");
  expect(vi.getTimerCount()).toBe(1);
  f.player.dispose();
  await f.flush();
  expect(vi.getTimerCount()).toBe(0);
  expect(f.solve).not.toHaveBeenCalled();
  const g = fixture();
  g.video.play.mockRejectedValueOnce(
    new DOMException("Denied", "NotAllowedError"),
  );
  await g.player.start("play");
  expect(g.state()?.status).toBe("denied");
  expect(g.solve).not.toHaveBeenCalled();
  let finish = () => {};
  g.video.play.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = () => {
          g.video.paused = false;
          resolve();
        };
      }),
  );
  const pending = g.player.start("play");
  g.player.dispose();
  finish();
  await pending;
  expect(g.video.paused).toBe(true);
  expect(g.solve).not.toHaveBeenCalled();
});

it("maps exactly nine actions to distinct boxes, separately from Audio Session recovery", () => {
  expect(new Set(Object.values(actionBoxes)).size).toBe(9);
  expect(Object.values(actionBoxes)).not.toContain("B02");
});

it("keeps the safety stop effective if an earlier play resolves late", async () => {
  const f = fixture();
  let finish = () => {};
  f.video.play.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = () => {
          f.video.paused = false;
          resolve();
        };
      }),
  );
  const pending = f.player.start("play");
  f.player.stop();
  finish();
  await pending;
  expect(f.video.paused).toBe(true);
  expect(f.solve).not.toHaveBeenCalled();
  f.player.dispose();
});
