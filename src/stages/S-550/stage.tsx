import "./stage.css";
import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import { useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { SensorStageShell, useStageSensor } from "../shared/sensorStage";
import {
  accelerationMagnitude,
  provisionalThreshold,
  reachesTarget,
} from "./acceleration";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const pixelsPerUnit = 14;

/**
 * S-550
 *
 * 目的: 重力を含む実加速度の大きさが低下する瞬間を、中央へ近づく簡易3Dスマホで示す。
 * 最初の一手: 「センサーを開始」を押し、端末を保持した動作で図の反応を探る。
 * 箱ごとの解法:
 * - B02「砂時計」: 端末を保持して低加速度を作り、実Accelerometerの有限な三軸のhypotが暫定2 m/s²以下となるreading一回で開く。しきい値の再調整は未確定。
 * 使用API: Generic Sensor APIのAccelerometer({frequency:60})。図の中心点は実合成値に比例した距離で移動し、目標円は同じ尺度のしきい値範囲を表す。姿勢や実位置の復元ではない。
 * 権限・privacy: 明示buttonからmotion sensor accessを開始し、表示用の直近合成値だけをmemoryに持つ。生reading・動作履歴を保存・送信しない。
 * 対応環境: 重力込みAccelerometerを公開するbrowser/端末。端末を放す・投げる・落とす操作を必須としない。
 */
function S550Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const [magnitude, setMagnitude] = useState<number | null>(null);
  const sensor = useStageSensor(
    props,
    () => new Accelerometer({ frequency: 60 }),
    (value) => {
      const observed = accelerationMagnitude([value.x, value.y, value.z]);
      setMagnitude(observed);
      if (reachesTarget(observed)) problem.solve();
    },
  );
  const offset =
    magnitude === null ? 156 : Math.min(156, magnitude * pixelsPerUnit);
  return (
    <SensorStageShell props={props} {...sensor}>
      <div className="s550-layout">
        <svg
          className="s550-space"
          viewBox="0 0 240 400"
          role="img"
          aria-label={stageText(props.locale, locale.diagram)}
        >
          <circle
            className="s550-target"
            cx="120"
            cy="200"
            r={provisionalThreshold * pixelsPerUnit}
          />
          <path d="M114 200h12m-6-6v12" stroke="currentColor" opacity="0.4" />
          <g
            className="s550-phone"
            data-observed={magnitude !== null}
            transform={`translate(120 ${200 + offset})`}
          >
            <path
              d="M-15-22 10-16 16-10 16 25-9 19-15 13Z"
              fill="#4c1d95"
              stroke="currentColor"
            />
            <path
              d="M-15-22 10-16 10 19-15 13Z"
              fill="#1e1b4b"
              stroke="currentColor"
            />
            <path
              d="M-11-16 6-12 6 12-11 8Z"
              fill="#c084fc"
              fillOpacity="0.22"
            />
            <circle r="2.5" fill="currentColor" />
          </g>
        </svg>
        <StageProblemGiftBox box={problem} locale={props.locale} />
      </div>
    </SensorStageShell>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: HourglassEmptyOutlined,
      color: "#c084fc",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Accelerometer" in window ? "permission-required" : "unsupported",
    ),
  Component: S550Stage,
});
