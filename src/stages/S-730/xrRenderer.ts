import {
  AmbientLight,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { createGift } from "./gift";
import { rayFromPose } from "./ray";

export function createXrView(
  session: XRSession,
  canvas: HTMLCanvasElement,
  ar: boolean,
  onSelected: () => void,
  onError: () => void,
) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(
    canvas.clientWidth || 640,
    canvas.clientHeight || 360,
    false,
  );
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  const scene = new Scene();
  scene.background = ar ? null : new Color(0x050816);
  const camera = new PerspectiveCamera(60, 16 / 9, 0.01, 30);
  const gift = createGift();
  scene.add(gift.root);
  const light = new PointLight(0xffffff, 12, 8);
  scene.add(light, new AmbientLight(0xffffff, 0.8));
  const beams = new Map<
    XRInputSource,
    Line<BufferGeometry, LineBasicMaterial>
  >();
  let referenceSpace: XRReferenceSpace | null = null;
  let placed = false;
  let selected = false;
  let disposed = false;
  const removeBeam = (source: XRInputSource) => {
    const line = beams.get(source);
    if (!line) return;
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
    beams.delete(source);
  };
  const intersects = (frame: XRFrame, source: XRInputSource) => {
    if (!referenceSpace || !placed || frame.session !== session) return null;
    const ray = rayFromPose(
      frame.getPose(source.targetRaySpace, referenceSpace),
    );
    if (!ray) return null;
    gift.root.updateMatrixWorld(true);
    return { ray, hit: ray.intersectObject(gift.root, true)[0] };
  };
  const onSelect = (event: XRInputSourceEvent) => {
    if (
      disposed ||
      selected ||
      !event.isTrusted ||
      session.visibilityState !== "visible" ||
      !Array.from(session.inputSources).includes(event.inputSource)
    )
      return;
    try {
      if (!intersects(event.frame, event.inputSource)?.hit) return;
      selected = true;
      gift.open();
      gift.setHighlighted(true);
      onSelected();
    } catch {
      /* Missing tracking is not a selection. */
    }
  };
  const dispose = () => {
    renderer.setAnimationLoop(null);
    session.removeEventListener("select", onSelect);
    if (!disposed) {
      disposed = true;
      for (const source of beams.keys()) removeBeam(source);
      gift.dispose();
      scene.clear();
    }
    renderer.dispose();
  };
  return {
    dispose,
    async start() {
      try {
        await renderer.xr.setSession(session);
        if (disposed) {
          renderer.dispose();
          throw new DOMException("Aborted", "AbortError");
        }
        const space = renderer.xr.getReferenceSpace();
        if (!space)
          throw new DOMException("No local space", "NotSupportedError");
        referenceSpace = space;
        session.addEventListener("select", onSelect);
        renderer.setAnimationLoop((_time, frame) => {
          if (disposed) return;
          try {
            if (!frame || frame.session !== session) return;
            if (!placed) {
              const viewer = frame.getViewerPose(space);
              const ray = rayFromPose(viewer);
              if (viewer && ray) {
                gift.root.position.copy(ray.ray.at(1.5, new Vector3()));
                gift.root.quaternion
                  .set(
                    viewer.transform.orientation.x,
                    viewer.transform.orientation.y,
                    viewer.transform.orientation.z,
                    viewer.transform.orientation.w,
                  )
                  .normalize();
                gift.root.visible = true;
                gift.root.updateMatrixWorld(true);
                light.position
                  .copy(gift.root.position)
                  .add(new Vector3(0.5, 1, 0.5));
                placed = true;
              }
            }
            let highlighted = false;
            for (const source of [...beams.keys()])
              if (!Array.from(session.inputSources).includes(source))
                removeBeam(source);
            for (const source of session.inputSources) {
              let line = beams.get(source);
              const result =
                session.visibilityState === "visible"
                  ? intersects(frame, source)
                  : null;
              if (!result) {
                if (line) line.visible = false;
                continue;
              }
              if (!line) {
                const geometry = new BufferGeometry();
                geometry.setAttribute(
                  "position",
                  new Float32BufferAttribute(new Float32Array(6), 3),
                );
                line = new Line(
                  geometry,
                  new LineBasicMaterial({ color: 0xb8a7d5 }),
                );
                line.frustumCulled = false;
                beams.set(source, line);
                scene.add(line);
              }
              line.visible = true;
              const end = result.ray.ray.at(
                result.hit?.distance ?? 4,
                new Vector3(),
              );
              const origin = result.ray.ray.origin;
              const positions = line.geometry.getAttribute("position");
              positions.setXYZ(0, origin.x, origin.y, origin.z);
              positions.setXYZ(1, end.x, end.y, end.z);
              positions.needsUpdate = true;
              line.material.color.setHex(result.hit ? 0x34d399 : 0xb8a7d5);
              highlighted ||= !!result.hit;
            }
            gift.setHighlighted(highlighted);
            gift.animate();
            renderer.render(scene, camera);
          } catch {
            onError();
          }
        });
      } catch (error) {
        dispose();
        throw error;
      }
    },
  };
}
