import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
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
 * S-550
 *
 * 目的: 重力を含むaccelerometer三軸の合成値が短時間ほぼ0になる低加速度区間を複数readingで確認する。
 * 最初の一手: 「センサーを開始」を押し、端末を安全に保持したまま短い自由落下相当の低加速度を作る。端末を投げず、安全な方法・検証機器を使う。
 * 箱ごとの解法:
 * - B01「低加速度の箱」: `hypot(x,y,z)`が2 m/s²以下のreadingを3回以上かつ最初から80 ms以上連続して観測すると開く。2を超えるとcountと開始時刻をresetする。
 * 使用API: Generic Sensor APIの`Accelerometer({frequency:60})`、三軸reading、`performance.now()`。
 * 権限・privacy: motion sensor accessは明示buttonから開始し、合成値の連続countと開始時刻だけをmemoryに持つ。生reading・動作履歴を保存・送信しない。
 * 対応環境: 重力込みAccelerometer readingsを十分な頻度で公開するbrowser/端末と、安全に低加速度を再現できる検証環境。
 */
function S550Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const run = useRef({ since: 0, count: 0 });
  const sensor = useStageSensor(
    props,
    () => new Accelerometer({ frequency: 60 }),
    (value) => {
      const magnitude = Math.hypot(value.x ?? 99, value.y ?? 99, value.z ?? 99);
      if (magnitude > 2) {
        run.current = { since: 0, count: 0 };
        return;
      }
      if (!run.current.since) run.current.since = performance.now();
      run.current.count += 1;
      if (run.current.count >= 3 && performance.now() - run.current.since >= 80)
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
      icon: HourglassEmptyOutlined,
      color: "#c084fc",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Accelerometer" in window ? "permission-required" : "unsupported",
    ),
  Component: S550Stage,
});
