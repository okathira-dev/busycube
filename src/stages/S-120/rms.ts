export const quietThreshold = 0.05;
export const loudThreshold = 0.2;
export const quietDurationMs = 500;

export function unweightedRms(samples: ArrayLike<number>) {
  if (!samples.length) return;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    if (value === undefined || !Number.isFinite(value)) return;
    sum += value * value;
  }
  const rms = Math.sqrt(sum / samples.length);
  return Number.isFinite(rms) ? rms : undefined;
}
export class QuietThenLoud {
  private quietSince: number | null = null;
  private previous: number | null = null;
  private armed = false;
  private solved = false;
  reset() {
    this.quietSince = null;
    this.previous = null;
    this.armed = false;
    this.solved = false;
  }
  observe(rms: number | undefined, time: number) {
    if (
      rms === undefined ||
      !Number.isFinite(rms) ||
      rms < 0 ||
      !Number.isFinite(time) ||
      time < 0
    ) {
      this.reset();
      return false;
    }
    if (
      this.previous !== null &&
      (time < this.previous || time - this.previous > 250)
    )
      this.reset();
    this.previous = time;
    if (this.solved) return false;
    if (!this.armed) {
      if (rms < quietThreshold) {
        this.quietSince ??= time;
        this.armed = time - this.quietSince >= quietDurationMs;
      } else this.quietSince = null;
    }
    if (this.armed && rms > loudThreshold) {
      this.solved = true;
      return true;
    }
    return false;
  }
}
export function audioProcessingReport(
  supported: MediaTrackSupportedConstraints,
  settings: MediaTrackSettings,
) {
  const keys = [
    "autoGainControl",
    "noiseSuppression",
    "echoCancellation",
  ] as const;
  const controls = keys.map((key) => ({
    key,
    supported: supported[key] === true,
    actual: typeof settings[key] === "boolean" ? settings[key] : undefined,
  }));
  const state = controls.some((control) => control.actual === true)
    ? "enabled"
    : controls.every((control) => control.actual === false)
      ? "disabled"
      : "unknown";
  return { controls, state };
}
