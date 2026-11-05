export const keys = [
  "geolocation",
  "notifications",
  "camera",
  "microphone",
  "accelerometer",
  "gyroscope",
  "local-fonts",
  "clipboard-read",
  "idle-detection",
  "clipboard-write",
] as const;
export type PermissionKey = (typeof keys)[number];
export type PermissionValue = PermissionState | "unknown" | "unavailable";
const fontWindow = () =>
  window as Window & { queryLocalFonts?: () => Promise<unknown> };

export function available(key: PermissionKey) {
  switch (key) {
    case "geolocation":
      return typeof navigator.geolocation?.watchPosition === "function";
    case "notifications":
      return (
        typeof Notification !== "undefined" &&
        typeof Notification.requestPermission === "function"
      );
    case "camera":
    case "microphone":
      return typeof navigator.mediaDevices?.getUserMedia === "function";
    case "accelerometer":
      return typeof Accelerometer !== "undefined";
    case "gyroscope":
      return typeof Gyroscope !== "undefined";
    case "local-fonts":
      return typeof fontWindow().queryLocalFonts === "function";
    case "clipboard-read":
      return typeof navigator.clipboard?.readText === "function";
    case "idle-detection":
      return typeof window.IdleDetector?.requestPermission === "function";
    case "clipboard-write":
      return typeof navigator.clipboard?.writeText === "function";
  }
}

export function queryPermission(key: PermissionKey) {
  // 一部の実装済みpermission nameはTypeScriptのPermissionNameに未収録。
  return navigator.permissions.query({ name: key as PermissionName });
}

function sensorPermission(sensor: Sensor, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sensor.removeEventListener("activate", activate);
      sensor.removeEventListener("error", fail);
      signal.removeEventListener("abort", abort);
      try {
        sensor.stop();
      } catch {
        /* A failed sensor may already be stopped. */
      }
      if (error) reject(error);
      else resolve();
    };
    const activate = () => finish();
    const fail = (event: Event) =>
      finish(
        Reflect.get(event, "error") ??
          new DOMException("Sensor unavailable", "NotReadableError"),
      );
    const abort = () => finish(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(
      () => finish(new DOMException("Sensor timed out", "TimeoutError")),
      10_000,
    );
    sensor.addEventListener("activate", activate);
    sensor.addEventListener("error", fail);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      sensor.start();
    } catch (error) {
      finish(error);
    }
  });
}

function locationPermission(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let watch: number | null = null;
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => finish(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    try {
      watch = navigator.geolocation.watchPosition(
        () => finish(),
        (error) => finish(error),
        { maximumAge: 0, timeout: 10_000 },
      );
      if (settled) navigator.geolocation.clearWatch(watch);
    } catch (error) {
      finish(error);
    }
  });
}

export async function requestPermission(
  key: PermissionKey,
  signal: AbortSignal,
) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  switch (key) {
    case "geolocation":
      await locationPermission(signal);
      break;
    case "notifications":
      await Notification.requestPermission();
      break;
    case "camera":
    case "microphone": {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: key === "camera",
        audio: key === "microphone",
      });
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* Stop every track even if one has already ended. */
        }
      }
      break;
    }
    case "accelerometer":
      await sensorPermission(new Accelerometer({ frequency: 1 }), signal);
      break;
    case "gyroscope":
      await sensorPermission(new Gyroscope({ frequency: 1 }), signal);
      break;
    case "local-fonts": {
      const host = fontWindow();
      if (!host.queryLocalFonts)
        throw new DOMException("Unavailable", "NotSupportedError");
      await host.queryLocalFonts();
      break;
    }
    case "clipboard-read":
      await navigator.clipboard.readText();
      break;
    case "idle-detection": {
      if (!window.IdleDetector)
        throw new DOMException("Unavailable", "NotSupportedError");
      await window.IdleDetector.requestPermission();
      break;
    }
    // 明示的な安全な要求APIがないため、再queryのみ。既存内容を上書きしない。
    case "clipboard-write":
      break;
  }
}
