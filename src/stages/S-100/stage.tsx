import "./styles.css";
import ScreenRotationOutlined from "@mui/icons-material/ScreenRotationOutlined";
import { useEffect, useRef, useState } from "react";
import type { Quaternion } from "three";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  deviceRotation,
  initialPhoneRotation,
  phoneMatrix,
  relativePhoneRotation,
  UprightHold,
} from "./orientation";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-100
 *
 * 目的: 三軸に傾いた3Dスマホを実端末の相対回転で正立・正面・表向きへそろえる。
 * 最初の一手: 回転の箱を押して必要な権限を許可し、表示された画面と上端の目印がまっすぐ正面を向くよう実端末を回す。
 * 箱ごとの解法:
 * - B02「画面の回転」: alpha/beta/gammaの最初の有効な実観測を基準に端末を回し、事前傾斜を打ち消す。表示姿勢と正面正立の角距離が8度以内の実観測を連続1秒保持すると開く。未観測/範囲外/500ms超の観測断で保持をリセットする。
 * 使用API: DeviceOrientationEventの実alpha/beta/gamma、必要な環境のrequestPermission、performance.now、QuaternionのZXY合成、CSS matrix3d。
 * 権限・privacy: 箱の明示操作でsensor権限を要求する。開始基準と現在姿勢だけを訪問memoryで扱い、姿勢履歴/方角/端末情報を保存・送信しない。
 * 対応環境: secure contextで三軸を公開するmobile browser等。初期傾斜はX22度/Y-28度/Z18度、固定方角を要求しない。画面には角度や別目標輪郭を表示せず、表の画面/上端と裏のカメラで向きを区別する。
 */
function S100Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const [matrix, setMatrix] = useState(() =>
    phoneMatrix(initialPhoneRotation()),
  );
  const [status, setStatus] = useState("idle");
  const cleanupRef = useRef<() => void>(() => {});
  const generationRef = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    const stop = () => {
      generationRef.current++;
      cleanupRef.current();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);
  const start = async () => {
    if (busy.current || props.signal.aborted) return;
    const generation = ++generationRef.current;
    cleanupRef.current();
    busy.current = true;
    setMatrix(phoneMatrix(initialPhoneRotation()));
    setStatus("waiting");
    try {
      const Orientation =
        window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<"granted" | "denied">;
        };
      if (!Orientation) {
        setStatus("unavailable");
        return;
      }
      if (Orientation.requestPermission) {
        const permission = await Orientation.requestPermission();
        if (props.signal.aborted || generation !== generationRef.current)
          return;
        if (permission !== "granted") {
          setStatus("denied");
          return;
        }
      }
      if (props.signal.aborted || generation !== generationRef.current) return;
      let initial: Quaternion | undefined;
      let active = true;
      let solved = false;
      const hold = new UprightHold();
      const observe = (event: DeviceOrientationEvent) => {
        if (
          !active ||
          props.signal.aborted ||
          document.hidden ||
          !event.isTrusted
        ) {
          hold.reset();
          return;
        }
        const current = deviceRotation(event);
        if (!current) {
          hold.reset();
          return;
        }
        initial ??= current.clone();
        const displayed = relativePhoneRotation(initial, current);
        setMatrix(phoneMatrix(displayed));
        setStatus("active");
        if (hold.observe(displayed, performance.now()) && !solved) {
          solved = true;
          problem.solve();
        }
      };
      const visibility = () => {
        if (document.hidden) hold.reset();
      };
      window.addEventListener("deviceorientation", observe);
      document.addEventListener("visibilitychange", visibility);
      cleanupRef.current = () => {
        active = false;
        hold.reset();
        window.removeEventListener("deviceorientation", observe);
        document.removeEventListener("visibilitychange", visibility);
      };
    } catch {
      if (!props.signal.aborted && generation === generationRef.current)
        setStatus("error");
    } finally {
      busy.current = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered s100-stage">
      <div
        className="s100-scene"
        role="img"
        aria-label={stageText(props.locale, locale.phone)}
      >
        <div className="s100-phone" style={{ transform: matrix }}>
          <div className="s100-phone__front">
            <span className="s100-phone__screen" />
            <span className="s100-phone__top" />
          </div>
          <div className="s100-phone__back">
            <span className="s100-phone__camera" />
            <span className="s100-phone__camera s100-phone__camera--second" />
          </div>
          <span className="s100-phone__side s100-phone__side--left" />
          <span className="s100-phone__side s100-phone__side--right" />
        </div>
      </div>
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={() => void start()}
      />
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: ScreenRotationOutlined,
      color: "#fb7185",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "DeviceOrientationEvent" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S100Stage,
});
