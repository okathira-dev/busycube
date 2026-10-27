import "./styles.css";
import OpenInFullOutlined from "@mui/icons-material/OpenInFullOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import SwapVertOutlined from "@mui/icons-material/SwapVertOutlined";
import { useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { useStageSensor } from "../shared/sensorStage";
import {
  type Axis,
  type AxisState,
  axes,
  initialAxis,
  observeAxis,
} from "./axes";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const ids = { x: manifest.box.B04, y: manifest.box.B05, z: manifest.box.B06 };
const diagramNames = {
  x: locale.horizontal,
  y: locale.vertical,
  z: locale.depth,
};
function AxisDiagram({
  axis,
  state,
  language,
}: {
  axis: Axis;
  state: AxisState;
  language: Props["locale"];
}) {
  const rotation = axis === "y" ? -90 : axis === "z" ? -20 : 0;
  const direction = (positive: boolean) => {
    const hit = positive ? state.positive : state.negative;
    const level =
      state.value === null
        ? 0
        : Math.min(
            1,
            Math.max(0, (positive ? state.value : -state.value) / 50),
          );
    return (
      <g
        className="s530-direction"
        data-direction={positive ? "positive" : "negative"}
        data-reached={hit}
        opacity={hit ? 1 : 0.25 + level * 0.75}
        strokeWidth={hit ? 5 : 2 + 3 * level}
        strokeDasharray={axis === "z" && !positive ? "4 4" : undefined}
      >
        <path
          d={positive ? "M116 80h38m-9-9 9 9-9 9" : "M64 80H26m9-9-9 9 9 9"}
        />
      </g>
    );
  };
  return (
    <svg
      className="s530-diagram"
      data-axis={axis}
      viewBox="0 0 180 160"
      role="img"
      aria-label={stageText(language, diagramNames[axis])}
    >
      <title>{stageText(language, diagramNames[axis])}</title>
      <g transform={`rotate(${rotation} 90 80)`}>{direction(false)}</g>
      <g
        className="s530-phone"
        transform={axis === "z" ? "matrix(.7 .24 0 .94 27 -16.8)" : undefined}
      >
        <rect x="72" y="45" width="36" height="70" rx="6" />
        <rect
          className="s530-screen"
          x="76"
          y="56"
          width="28"
          height="48"
          rx="2"
        />
        <path d="M85 50h10m-7 59h4" />
      </g>
      <g transform={`rotate(${rotation} 90 80)`}>{direction(true)}</g>
    </svg>
  );
}

/**
 * S-530
 *
 * 目的: 重力を除いた実加速度を三軸別に読み、図で示す正負両側の観測を集める。
 * 最初の一手: 箱を押して観測を開始し、保持した端末の動作と各図の反応を確かめる。
 * 箱ごとの解法:
 * - B04「左右矢印」: 簡易スマホの左右に対応するX軸で端末を保持して動かす。実LinearAccelerationSensor.xが-50以下と+50以上の両方になれば開く。
 * - B05「上下矢印」: 簡易スマホの上下に対応するY軸で端末を保持して動かす。同じ挑戦中に実yが-50以下と+50以上の両方になれば開く。
 * - B06「斜めの両矢印」: 簡易スマホの画面に対する前後に対応するZ軸で端末を保持して動かす。同じ挑戦中に実zが-50以下と+50以上の両方になれば開く。各軸とも単位はm/s²、正負の順序/保持時間は問わない。
 * 使用API: LinearAccelerationSensor({frequency:60})、実readingのx/y/z、Generic Sensor lifecycle。
 * 権限・privacy: 箱の明示操作で開始し、直近値と正負の通過booleanだけをmemoryに保持する。生加速度/動作履歴を保存・送信しない。図は軸/加速度の反応であり、姿勢/位置を復元したものではない。
 * 対応環境: secure contextでLinearAccelerationSensorの有効な三軸readingを提供するbrowser/端末。図の軸は端末座標で表す。
 */
function S530Stage(props: Props) {
  const [states, setStates] = useState<Record<Axis, AxisState>>(() => ({
    x: initialAxis(),
    y: initialAxis(),
    z: initialAxis(),
  }));
  const observed = useRef(states);
  const opened = useRef(new Set<Axis>());
  const sensor = useStageSensor(
    props,
    () => new LinearAccelerationSensor({ frequency: 60 }),
    (value) => {
      const next = {
        x: observeAxis(observed.current.x, value.x),
        y: observeAxis(observed.current.y, value.y),
        z: observeAxis(observed.current.z, value.z),
      };
      observed.current = next;
      setStates(next);
      for (const axis of axes) {
        if (
          next[axis].negative &&
          next[axis].positive &&
          !opened.current.has(axis)
        ) {
          opened.current.add(axis);
          props.boxes[ids[axis]].solve();
        }
      }
    },
  );
  return (
    <div className="puzzle puzzle--centered">
      <div className="s530-axes">
        {axes.map((axis) => (
          <div className="s530-axis" key={axis}>
            <AxisDiagram
              axis={axis}
              state={states[axis]}
              language={props.locale}
            />
            <StageProblemGiftBox
              box={props.boxes[ids[axis]]}
              locale={props.locale}
              onClick={sensor.start}
            />
          </div>
        ))}
      </div>
      <p className="interaction-status" role="status">
        {statusText(props.locale, sensor.status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B04]: {
      icon: SwapHorizOutlined,
      color: "#fb7185",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: SwapVertOutlined,
      color: "#34d399",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: OpenInFullOutlined,
      color: "#60a5fa",
      label: locale.B06,
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
