import { Group, Line, Mesh, MeshStandardMaterial, type Scene } from "three";
import { createXrView } from "./xrRenderer";

const harness = vi.hoisted(() => {
  class Renderer {
    loop: ((time: number, frame?: XRFrame) => void) | null = null;
    xr = {
      enabled: false,
      setReferenceSpaceType: vi.fn(),
      setSession: vi.fn(async () => {}),
      getReferenceSpace: () => ({}) as XRReferenceSpace,
    };
    setSize = vi.fn();
    render = vi.fn((_scene: unknown, _camera: unknown) => {});
    dispose = vi.fn();
    setAnimationLoop(callback: typeof this.loop) {
      this.loop = callback;
    }
    constructor() {
      instances.push(this);
    }
  }
  const instances: Renderer[] = [];
  return { Renderer, instances };
});
vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof import("three")>()),
  WebGLRenderer: harness.Renderer,
}));

class Session extends EventTarget {
  visibilityState = "visible";
  inputSources: XRInputSource[] = [];
  listeners = new Set<EventListenerOrEventListenerObject>();
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    super.addEventListener(type, listener, options);
    if (type === "select" && listener) this.listeners.add(listener);
  }
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    super.removeEventListener(type, listener, options);
    if (type === "select" && listener) this.listeners.delete(listener);
  }
  select(frame: XRFrame, source: XRInputSource, trusted: boolean) {
    const event = new Proxy(new Event("select"), {
      get(target, key) {
        if (key === "isTrusted") return trusted;
        if (key === "frame") return frame;
        if (key === "inputSource") return source;
        return Reflect.get(target, key);
      },
    });
    for (const listener of this.listeners) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}
const pose = (x: number, y: number, z = 0): XRPose =>
  ({
    transform: {
      position: { x, y, z },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
  }) as XRPose;
afterEach(() => {
  harness.instances.length = 0;
});

it("places a gift in front of the viewer, highlights actual rays, and requires a fresh trusted select intersection", async () => {
  const session = new Session();
  const xr = session as unknown as XRSession;
  const source = { targetRaySpace: {} } as XRInputSource;
  session.inputSources = [source];
  let inputPose: XRPose | null = pose(1, 1.6);
  const frame = {
    session: xr,
    getViewerPose: () => pose(1, 1.6),
    getPose: () => inputPose,
  } as unknown as XRFrame;
  const eventFrame = {
    session: xr,
    getPose: () => inputPose,
    getViewerPose: () => {
      throw new Error("Event frames cannot query viewer pose");
    },
  } as unknown as XRFrame;
  const selected = vi.fn();
  const error = vi.fn();
  const view = createXrView(
    xr,
    { clientWidth: 640, clientHeight: 360 } as HTMLCanvasElement,
    false,
    selected,
    error,
  );
  await view.start();
  const renderer = harness.instances[0];
  if (!renderer) throw new Error("No renderer");
  session.select(eventFrame, source, true);
  expect(selected).not.toHaveBeenCalled();
  renderer.loop?.(0, frame);
  const scene = renderer.render.mock.calls[0]?.[0] as Scene;
  const gift = scene.getObjectByName("s730-gift");
  expect(gift).toBeInstanceOf(Group);
  expect(gift?.position.toArray()).toEqual([1, 1.6, -1.5]);
  expect(scene.children.some((child) => child instanceof Line)).toBe(true);
  const body = gift?.children.find((child) => child instanceof Mesh) as
    | Mesh
    | undefined;
  if (!body || !(body.material instanceof MeshStandardMaterial))
    throw new Error("No gift material");
  expect(body.material.emissiveIntensity).toBe(0.4);
  expect(selected).not.toHaveBeenCalled();
  session.select(eventFrame, source, false);
  session.select({ ...eventFrame, session: {} } as XRFrame, source, true);
  session.select(eventFrame, { targetRaySpace: {} } as XRInputSource, true);
  expect(selected).not.toHaveBeenCalled();
  inputPose = pose(5, 1.6);
  session.select(eventFrame, source, true);
  inputPose = null;
  session.select(eventFrame, source, true);
  inputPose = pose(1, 1.6);
  session.visibilityState = "hidden";
  session.select(eventFrame, source, true);
  expect(selected).not.toHaveBeenCalled();
  session.visibilityState = "visible";
  session.select(eventFrame, source, true);
  session.select(eventFrame, source, true);
  expect(selected).toHaveBeenCalledOnce();
  expect(error).not.toHaveBeenCalled();
  const line = scene.children.find((child) => child instanceof Line);
  if (!(line instanceof Line)) throw new Error("No ray beam");
  const geometryDispose = vi.spyOn(line.geometry, "dispose");
  session.inputSources = [];
  renderer.loop?.(16, frame);
  expect(geometryDispose).toHaveBeenCalledOnce();
  view.dispose();
  expect(renderer.loop).toBeNull();
  expect(session.listeners.size).toBe(0);
  expect(renderer.dispose).toHaveBeenCalled();
});
