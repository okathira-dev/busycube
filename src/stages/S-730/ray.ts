import { Quaternion, Raycaster, Vector3 } from "three";

export function rayFromPose(pose: XRPose | null | undefined) {
  if (!pose) return null;
  const p = pose.transform.position;
  const q = pose.transform.orientation;
  if (![p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite)) return null;
  const orientation = new Quaternion(q.x, q.y, q.z, q.w);
  if (!Number.isFinite(orientation.lengthSq()) || orientation.lengthSq() === 0)
    return null;
  orientation.normalize();
  return new Raycaster(
    new Vector3(p.x, p.y, p.z),
    new Vector3(0, 0, -1).applyQuaternion(orientation),
  );
}
