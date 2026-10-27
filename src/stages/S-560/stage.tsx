import "./stage.css";
import ScreenRotationOutlined from "@mui/icons-material/ScreenRotationOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { useStageSensor } from "../shared/sensorStage";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  completesTurn,
  fullTurn,
  initialRotation,
  observeRotation,
  type Rotation,
} from "./rotation";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const axes = ["x", "y", "z"] as const;
type Axis = (typeof axes)[number];
const ids = { x: manifest.box.B04, y: manifest.box.B05, z: manifest.box.B06 };
const initial = (): Record<Axis, Rotation> => ({
  x: initialRotation(),
  y: initialRotation(),
  z: initialRotation(),
});

function RotationDiagram({
  axis,
  angle,
  language,
}: {
  axis: Axis;
  angle: number;
  language: Props["locale"];
}) {
  const progress = Math.min(1, Math.abs(angle) / fullTurn);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arrowTransform =
    axis === "x"
      ? "translate(100 100) scale(.4 .68)"
      : axis === "y"
        ? "translate(100 100) scale(.68 .3)"
        : "translate(100 100) scale(.68)";
  return (
    <svg
      className="s560-diagram"
      data-axis={axis}
      viewBox="0 0 200 200"
      role="img"
      aria-label={stageText(language, locale[axis])}
    >
      <title>{stageText(language, locale[axis])}</title>
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke="currentColor"
        opacity="0.2"
        strokeWidth="4"
      />
      <g
        transform={`translate(100 100) scale(${angle < 0 ? -1 : 1} 1) rotate(-90)`}
      >
        <circle
          className="s560-progress"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </g>
      <g fill="#211a35" stroke="currentColor" strokeWidth="2">
        <path d="M78 58 116 66 122 73V146L84 138 78 131Z" />
        <path d="M78 58 116 66V139L78 131Z" />
        <path d="M83 71 111 77V125L83 119Z" fill="#c084fc" fillOpacity="0.15" />
      </g>
      <path
        d={
          axis === "x"
            ? "M60 100h80"
            : axis === "y"
              ? "M100 48v104"
              : "M83 119l34-38"
        }
        stroke="currentColor"
        strokeDasharray="3 4"
      />
      <g
        transform={arrowTransform}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M0-64A64 64 0 1 1-45-45m-4-18 4 18 18-4" />
      </g>
    </svg>
  );
}

/**
 * S-560
 *
 * 目的: 実Gyroscopeの符号付き角速度を積分し、端末の三軸別に一周の角移動を集める。
 * 最初の一手: 箱を押して観測を始め、簡易3Dスマホの軸と回転矢印に対応する方向へ端末を回す。
 * 箱ごとの解法:
 * - B04「回る端末」: 端末を左右方向のX軸回りに回し、実x角速度の符号付き累積角が+2π rad以上または-2π rad以下になれば開く。
 * - B05「回る端末」: 端末を上下方向のY軸回りに回し、実yの符号付き累積角が±2π radへ達すれば開く。
 * - B06「回る端末」: 端末を画面に垂直なZ軸回りに回し、実zの符号付き累積角が±2π radへ達すれば開く。各軸の逆回転は打ち消し、順序/回転速度は問わない。
 * 使用API: Gyroscope({frequency:60})の実角速度rad/sとtimestamp。初回角を0とし、隣接する有効reading間を台形積分する。欠損/非表示/再起動/250ms超の中断を橋渡しせず、中断前の累積角は保持する。円周の進捗は累積角の絶対値、一周の推定値であり姿勢差の証明ではない。
 * 権限・privacy: 箱からmotion sensor accessを開始。軸別累積角と積分用の直前一値だけをmemoryに保持し、生角速度・姿勢履歴を保存・送信しない。
 * 対応環境: secure contextでGyroscopeの有限な角速度と単調timestampを提供するbrowser/端末。
 */
function S560Stage(props: Props) {
  const observed = useRef(initial());
  const opened = useRef(new Set<Axis>());
  const [angles, setAngles] = useState<Record<Axis, number>>({
    x: 0,
    y: 0,
    z: 0,
  });
  const breakSampling = useCallback(() => {
    for (const axis of axes) observed.current[axis].previous = null;
  }, []);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) breakSampling();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [breakSampling]);
  const sensor = useStageSensor(
    props,
    () => {
      breakSampling();
      return new Gyroscope({ frequency: 60 });
    },
    (value) => {
      for (const axis of axes) {
        const next = observeRotation(
          observed.current[axis],
          value[axis],
          value.timestamp,
        );
        observed.current[axis] = next;
        if (completesTurn(next.angle) && !opened.current.has(axis)) {
          opened.current.add(axis);
          props.boxes[ids[axis]].solve();
        }
      }
      setAngles({
        x: observed.current.x.angle,
        y: observed.current.y.angle,
        z: observed.current.z.angle,
      });
    },
  );
  return (
    <div className="puzzle puzzle--centered">
      <div className="s560-axes">
        {axes.map((axis) => (
          <div
            key={axis}
            className="s560-axis"
            data-reached={opened.current.has(axis)}
          >
            <RotationDiagram
              axis={axis}
              angle={angles[axis]}
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
      icon: ScreenRotationOutlined,
      color: "#fb7185",
      label: locale.B04,
    },
    [manifest.box.B05]: {
      icon: ScreenRotationOutlined,
      color: "#34d399",
      label: locale.B05,
    },
    [manifest.box.B06]: {
      icon: ScreenRotationOutlined,
      color: "#60a5fa",
      label: locale.B06,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Gyroscope" in window ? "permission-required" : "unsupported",
    ),
  Component: S560Stage,
});
