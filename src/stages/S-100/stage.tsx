import ScreenRotationOutlined from "@mui/icons-material/ScreenRotationOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

type InteractionState = "idle" | "active" | "denied" | "unavailable";

interface PermissionAwareOrientationEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/**
 * S-100
 *
 * 目的: 端末の実姿勢を傾斜角として読み、指定角度へ傾けたまま静止できたことを確認する。
 * 最初の一手: 「姿勢を読み取る」を押して必要ならmotion/orientation権限を許可し、端末を前後方向へ約45°傾ける。
 * 箱ごとの解法:
 * - B01「端末姿勢の箱」: `beta`が45°±12°かつ`gamma`が0°±12°の範囲を連続1,000 ms以上保つと開く。範囲外へ出るたび保持時間は0から測り直す。
 * 使用API: Device Orientation Eventsの`deviceorientation`、`beta` / `gamma`、iOS系の`DeviceOrientationEvent.requestPermission()`、`performance.now()`。
 * 権限・privacy: sensor権限はbutton操作時だけ要求し、二つの角度は現在表示と保持判定にだけ使って保存・送信しない。
 * 対応環境: Device Orientation Eventsを実装し、実端末の姿勢sensor値をpageへ公開するmobile browser等。
 */
function S100Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<InteractionState>("idle");
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const cleanupRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const cleanup = () => cleanupRef.current();
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [props.signal]);

  const start = async () => {
    cleanupRef.current();
    try {
      const orientation =
        DeviceOrientationEvent as unknown as PermissionAwareOrientationEvent;
      if (orientation.requestPermission) {
        const permission = await orientation.requestPermission();
        if (props.signal.aborted) return;
        if (permission !== "granted") {
          setStatus("denied");
          return;
        }
      }

      let targetSince: number | null = null;
      const observe = (event: DeviceOrientationEvent) => {
        const beta = event.beta ?? 0;
        const gamma = event.gamma ?? 0;
        setTilt({ beta, gamma });
        const onTarget = Math.abs(beta - 45) <= 12 && Math.abs(gamma) <= 12;
        if (!onTarget) {
          targetSince = null;
        } else if (targetSince === null) {
          targetSince = performance.now();
        } else if (performance.now() - targetSince >= 1000) {
          problem.solve();
        }
      };
      window.addEventListener("deviceorientation", observe);
      cleanupRef.current = () =>
        window.removeEventListener("deviceorientation", observe);
      setStatus("active");
    } catch {
      if (!props.signal.aborted) setStatus("unavailable");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div
        className="tilt-clue"
        style={{ transform: `rotate(${tilt.gamma}deg)` }}
        aria-hidden="true"
      >
        ▰
      </div>
      <p className="measurement">
        β {Math.round(tilt.beta)}° · γ {Math.round(tilt.gamma)}°
      </p>
      <button
        type="button"
        className="stage-action"
        onClick={() => void start()}
      >
        {stageText(props.locale, locale.senseOrientation)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ScreenRotationOutlined,
      color: "#fb7185",
      label: locale.B01,
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
