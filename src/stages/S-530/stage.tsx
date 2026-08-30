import RouteOutlined from "@mui/icons-material/RouteOutlined";
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

/**
 * S-530
 *
 * 目的: 重力を除いたlinear accelerationを三軸別に読み、各軸で正負両方向の強い加速を集める。
 * 最初の一手: 「センサーを開始」を押し、端末をX軸の正方向と負方向へ素早く動かして止め、Y・Z軸でも同様に往復させる。
 * 箱ごとの解法:
 * - B01「X軸の箱」: X readingで-8 m/s²以下と+8 m/s²以上を同じattempt中に両方観測すると開く。
 * - B02「Y軸の箱」: Y readingで-8 m/s²以下と+8 m/s²以上を同じattempt中に両方観測すると開く。
 * - B03「Z軸の箱」: Z readingで-8 m/s²以下と+8 m/s²以上を同じattempt中に両方観測すると開く。
 * 使用API: Generic Sensor APIの`LinearAccelerationSensor({frequency:60})`とx/y/z readings。
 * 権限・privacy: motion sensor accessは明示buttonから開始し、各軸の閾値通過signだけをmemoryに残す。生加速度・動作履歴を保存・送信しない。
 * 対応環境: LinearAccelerationSensorと実三軸motion readingsを60 Hz程度で提供するbrowser/端末。
 */
function S530Stage(props: Props) {
  const problems = [
    props.boxes[manifest.box.B01],
    props.boxes[manifest.box.B02],
    props.boxes[manifest.box.B03],
  ] as const;
  const signs = useRef([
    [false, false],
    [false, false],
    [false, false],
  ]);
  const sensor = useStageSensor(
    props,
    () => new LinearAccelerationSensor({ frequency: 60 }),
    (value) => {
      [value.x, value.y, value.z].forEach((axis, index) => {
        if (axis === null || Math.abs(axis) < 8) return;
        const axisSigns = signs.current[index];
        const problem = problems[index];
        if (!axisSigns || !problem) return;
        axisSigns[axis > 0 ? 1 : 0] = true;
        if (axisSigns.every(Boolean)) problem.solve();
      });
    },
  );
  return (
    <SensorStageShell props={props} {...sensor}>
      {problems.map((problem) => (
        <StageProblemGiftBox
          key={problem.id}
          box={problem}
          locale={props.locale}
        />
      ))}
    </SensorStageShell>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: RouteOutlined,
      color: "#fb7185",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: RouteOutlined,
      color: "#34d399",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: RouteOutlined,
      color: "#60a5fa",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "LinearAccelerationSensor" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S530Stage,
});
