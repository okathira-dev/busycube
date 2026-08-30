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

/**
 * S-560
 *
 * 目的: gyroscopeの角速度絶対値を時間積分し、端末が各axis回りに累計1回転分動いたことを軸別に集める。
 * 最初の一手: 「センサーを開始」を押し、端末をX軸回りに一回転させ、続いてY軸・Z軸回りにも一回転させる。
 * 箱ごとの解法:
 * - B01「X回転の箱」: X角速度の絶対値×経過秒を累積し、2π rad以上になると開く。
 * - B02「Y回転の箱」: Y角速度の絶対値×経過秒を累積し、2π rad以上になると開く。
 * - B03「Z回転の箱」: Z角速度の絶対値×経過秒を累積し、2π rad以上になると開く。各sampleの積分時間は最大0.1秒に制限する。
 * 使用API: Generic Sensor APIの`Gyroscope({frequency:60})`、x/y/z角速度とsensor timestamp、`performance.now()` fallback。
 * 権限・privacy: motion sensor accessは明示buttonから開始し、軸別累積角だけをmemoryに持つ。生角速度・姿勢履歴を保存・送信しない。
 * 対応環境: Gyroscopeとtimestamp付き三軸角速度を十分な頻度で提供するbrowser/端末。
 */
function S560Stage(props: Props) {
  const problems = [
    props.boxes[manifest.box.B01],
    props.boxes[manifest.box.B02],
    props.boxes[manifest.box.B03],
  ] as const;
  const accumulated = useRef([0, 0, 0]);
  const last = useRef<number | null>(null);
  const sensor = useStageSensor(
    props,
    () => new Gyroscope({ frequency: 60 }),
    (value) => {
      const now = value.timestamp ?? performance.now();
      const dt =
        last.current === null ? 0 : Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      [value.x, value.y, value.z].forEach((axis, index) => {
        const prior = accumulated.current[index] ?? 0;
        accumulated.current[index] = prior + Math.abs(axis ?? 0) * dt;
        const problem = problems[index];
        if (problem && accumulated.current[index] >= Math.PI * 2)
          problem.solve();
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
      icon: ScreenRotationOutlined,
      color: "#fb7185",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: ScreenRotationOutlined,
      color: "#34d399",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: ScreenRotationOutlined,
      color: "#60a5fa",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Gyroscope" in window ? "permission-required" : "unsupported",
    ),
  Component: S560Stage,
});
