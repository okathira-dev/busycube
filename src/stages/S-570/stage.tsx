import ScreenRotationOutlined from "@mui/icons-material/ScreenRotationOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { SensorStageShell, useStageSensor } from "../shared/sensorStage";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useRef } from "react";

function quaternionDistance(a: readonly number[], b: readonly number[]) {
  return Math.min(
    Math.hypot(...a.map((value, index) => value - (b[index] ?? 0))),
    Math.hypot(...a.map((value, index) => value + (b[index] ?? 0))),
  );
}

/**
 * S-570
 *
 * 目的: 開始姿勢から三つのquaternion vector成分をそれぞれ大きく変化させた後、開始姿勢へ一巡して戻る。
 * 最初の一手: 「センサーを開始」を押して開始姿勢を記録し、端末を三軸方向へ十分大きく向け替えてから元の向きへ戻す。
 * 箱ごとの解法:
 * - B01「巡回の箱」: relative orientation quaternionの|x|・|y|・|z|が各一度0.65超になり、三gate成立後に現在quaternionと開始quaternionの符号同値を考慮した距離が0.25未満になると開く。
 * 使用API: Generic Sensor APIの`RelativeOrientationSensor({frequency:30})`とquaternion readings、Euclidean distance計算。
 * 権限・privacy: orientation sensor accessは明示buttonから開始し、開始quaternionと三gateだけをmemoryに持つ。姿勢系列を保存・送信しない。
 * 対応環境: RelativeOrientationSensorと安定したquaternion readingsを提供するbrowser/端末。
 */
function S570Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const start = useRef<readonly number[] | null>(null);
  const gates = useRef(new Set<number>());
  const sensor = useStageSensor(
    props,
    () => new RelativeOrientationSensor({ frequency: 30 }),
    (value) => {
      const q = value.quaternion;
      if (!q) return;
      if (!start.current) {
        start.current = [...q];
        return;
      }
      const vector = q.slice(0, 3).map(Math.abs);
      vector.forEach((component, index) => {
        if (component > 0.65) gates.current.add(index);
      });
      if (
        gates.current.size === 3 &&
        quaternionDistance(q, start.current) < 0.25
      )
        problem.solve();
    },
  );
  return (
    <SensorStageShell props={props} {...sensor}>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </SensorStageShell>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ScreenRotationOutlined,
      color: "#22d3ee",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "RelativeOrientationSensor" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S570Stage,
});
