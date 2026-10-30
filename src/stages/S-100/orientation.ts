import { Euler, Matrix4, Quaternion } from "three";

const radians = Math.PI / 180;
export const uprightTolerance = 8 * radians;
export function initialPhoneRotation() {
  return new Quaternion().setFromEuler(
    new Euler(22 * radians, -28 * radians, 18 * radians, "ZXY"),
  );
}
export function deviceRotation({
  alpha,
  beta,
  gamma,
}: {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}) {
  if (
    alpha === null ||
    beta === null ||
    gamma === null ||
    ![alpha, beta, gamma].every(Number.isFinite) ||
    alpha < 0 ||
    alpha > 360 ||
    Math.abs(beta) > 180 ||
    Math.abs(gamma) > 90
  )
    return;
  return new Quaternion().setFromEuler(
    new Euler(beta * radians, gamma * radians, alpha * radians, "ZXY"),
  );
}
export function relativePhoneRotation(
  initial: Quaternion,
  current: Quaternion,
) {
  return initial
    .clone()
    .invert()
    .multiply(current)
    .multiply(initialPhoneRotation())
    .normalize();
}
export function phoneMatrix(rotation: Quaternion) {
  // deviceのy上向きからCSSのy下向きへ基底変換。判定と同じ姿勢を表示する。
  const flip = new Matrix4().makeScale(1, -1, 1);
  const matrix = new Matrix4()
    .makeRotationFromQuaternion(rotation)
    .premultiply(flip)
    .multiply(flip);
  return `matrix3d(${matrix.elements.map((value) => (Math.abs(value) < 1e-12 ? 0 : value)).join(",")})`;
}
export class UprightHold {
  private since: number | null = null;
  private previous: number | null = null;
  reset() {
    this.since = null;
    this.previous = null;
  }
  observe(rotation: Quaternion | undefined, time: number) {
    if (
      !rotation ||
      !Number.isFinite(time) ||
      (this.previous !== null && time < this.previous)
    ) {
      this.reset();
      return false;
    }
    if (this.previous !== null && time - this.previous > 500) this.since = null;
    this.previous = time;
    const distance = rotation.angleTo(new Quaternion());
    if (!Number.isFinite(distance) || distance > uprightTolerance) {
      this.since = null;
      return false;
    }
    this.since ??= time;
    return time - this.since >= 1000;
  }
}
