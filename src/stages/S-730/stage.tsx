import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useRef, useState } from "react";
// TODO: S-730の最小描画・raycastをThree.jsで維持するか、WebXR/WebGLの直接実装へ置き換えて依存を削除するかを設計レビューする。
import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  Raycaster,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-730
 *
 * 目的: immersive WebXR sessionを開始し、XR空間の正面1.5 mに置いたboxへ実input sourceのtarget rayを当てる。
 * 最初の一手: AR/VR機器を接続し「XR空間を開く」からbrowser開始UIを完了する。正面の紫boxへcontrollerを向けてselectする。
 * 箱ごとの解法:
 * - B01「XR姿勢の箱」: `immersive-vr`優先、非対応なら`immersive-ar` sessionを開始し、animation frameで最初の非null viewer poseを得ると開く。
 * - B02「XR選択の箱」: B01後の実`select` eventからtargetRaySpace poseを得てraycastし、0.4 m角・正面z=-1.5 mのbox meshと交差すると開く。
 * 使用API: WebXR Device APIのsupport/requestSession/reference space/viewer pose/input select、WebGLとThree.js renderer/raycast。
 * 権限・privacy: XR sessionは明示buttonから開始し、pose/rayは現在frameの交差判定だけに使う。部屋映像・座標履歴・device情報を保存・送信しない。
 * 対応環境: secure contextでimmersive-vrまたはimmersive-arと対応AR/VR hardware、WebGLを提供するbrowser。
 */
function S730Stage(props: Props) {
  const sessionProblem = props.boxes[manifest.box.B01];
  const selectProblem = props.boxes[manifest.box.B02];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<
    | {
        session: XRSession;
        renderer: WebGLRenderer;
        box: Mesh;
        referenceSpace: XRReferenceSpace;
        onSelect: (event: XRInputSourceEvent) => void;
        dispose: () => void;
      }
    | undefined
  >(undefined);
  const [status, setStatus] = useState(() =>
    stageText(props.locale, locale.idle),
  );

  const cleanup = useCallback(async () => {
    const runtime = runtimeRef.current;
    runtimeRef.current = undefined;
    if (!runtime) return;
    runtime.session.removeEventListener("select", runtime.onSelect);
    runtime.renderer.setAnimationLoop(null);
    runtime.dispose();
    try {
      await runtime.session.end();
    } catch {
      // The platform may already be tearing down the immersive session.
    }
  }, []);

  useEffect(() => {
    const stop = () => void cleanup();
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      void cleanup();
    };
  }, [cleanup, props.signal]);

  const start = async () => {
    const xr = navigator.xr;
    const canvas = canvasRef.current;
    if (!xr || !canvas) {
      setStatus(stageText(props.locale, locale.unsupported));
      return;
    }
    await cleanup();
    setStatus(stageText(props.locale, locale.starting));
    try {
      const vr = await xr.isSessionSupported("immersive-vr");
      const ar = vr ? false : await xr.isSessionSupported("immersive-ar");
      if (!vr && !ar) {
        setStatus(stageText(props.locale, locale.unsupported));
        return;
      }
      const session = await xr.requestSession(
        vr ? "immersive-vr" : "immersive-ar",
        {
          optionalFeatures: ["local-floor"],
        },
      );
      const renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local-floor");
      await renderer.xr.setSession(session);
      const referenceSpace = await session
        .requestReferenceSpace("local-floor")
        .catch(() => session.requestReferenceSpace("viewer"));
      const scene = new Scene();
      scene.background = new Color(0x050816);
      const camera = new PerspectiveCamera(60, 16 / 9, 0.01, 20);
      const box = new Mesh(
        new BoxGeometry(0.4, 0.4, 0.4),
        new MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.35 }),
      );
      box.position.set(0, 0, -1.5);
      scene.add(box);
      const light = new PointLight(0xffffff, 4, 10);
      light.position.set(0.5, 1, -0.5);
      scene.add(light);
      let disposed = false;
      const dispose = () => {
        if (disposed) return;
        disposed = true;
        box.geometry.dispose();
        const material = box.material;
        if (Array.isArray(material))
          material.forEach((item) => {
            item.dispose();
          });
        else material.dispose();
        renderer.dispose();
      };
      let poseSeen = false;
      const onSelect = (event: XRInputSourceEvent) => {
        const pose = event.frame.getPose(
          event.inputSource.targetRaySpace,
          referenceSpace,
        );
        if (!pose || !poseSeen) return;
        const origin = new Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z,
        );
        const orientation = new Quaternion(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w,
        );
        const direction = new Vector3(0, 0, -1).applyQuaternion(orientation);
        if (new Raycaster(origin, direction).intersectObject(box).length === 0)
          return;
        selectProblem.solve();
        setStatus(stageText(props.locale, locale.selected));
      };
      session.addEventListener("select", onSelect);
      session.addEventListener(
        "end",
        () => {
          session.removeEventListener("select", onSelect);
          if (runtimeRef.current?.session !== session) {
            dispose();
            return;
          }
          runtimeRef.current = undefined;
          renderer.setAnimationLoop(null);
          dispose();
          setStatus(stageText(props.locale, locale.ended));
        },
        { once: true },
      );
      runtimeRef.current = {
        session,
        renderer,
        box,
        referenceSpace,
        onSelect,
        dispose,
      };
      renderer.setAnimationLoop((_time, frame) => {
        if (frame && !poseSeen && frame.getViewerPose(referenceSpace)) {
          poseSeen = true;
          sessionProblem.solve();
          setStatus(stageText(props.locale, locale.pose));
        }
        renderer.render(scene, camera);
      });
    } catch {
      setStatus(stageText(props.locale, locale.cancelled));
      await cleanup();
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={sessionProblem} locale={props.locale} />
        <StageProblemGiftBox box={selectProblem} locale={props.locale} />
      </div>
      <canvas ref={canvasRef} className="s730-canvas" />
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          onClick={() => void start()}
        >
          {stageText(props.locale, locale.start)}
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => {
            void cleanup().then(() =>
              setStatus(stageText(props.locale, locale.ended)),
            );
          }}
        >
          {stageText(props.locale, locale.end)}
        </button>
      </div>
      <p className="stage-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DevicesOutlined,
      color: "#60a5fa",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: SelectAllOutlined,
      color: "#a78bfa",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "xr" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S730Stage,
});
