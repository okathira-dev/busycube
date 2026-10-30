import "./stage.css";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { useEffect, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import {
  type Anchor,
  anchorKey,
  conservativeDistance,
  distanceRadius,
  radii,
  storedAnchor,
  thresholds,
  validFix,
} from "./distance";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const placements = [
  { x: 300, y: 210 },
  { x: 148.445554, y: 387.5 },
  { x: 525.166605, y: 430 },
];
function removeAnchor() {
  try {
    sessionStorage.removeItem(anchorKey);
  } catch {
    /* Storage may be disabled. */
  }
}

/**
 * S-590
 *
 * 目的: 出発点からの実測距離と三つの同心円で、距離に対応する箱を見つける。
 * 最初の一手: 入場時に位置情報を許可し、最初の有効な測位から端末を持って離れ、円と距離の印の変化を探る。
 * 箱ごとの解法:
 * - B01「点を結ぶ道」: 出発点から離れ、実測の球面距離から出発点と現在地のaccuracyを引いた保守的距離が5m以上になれば開く。
 * - B02「点を結ぶ道」: 出発点からさらに離れ、同じ保守的距離が25m以上になれば開く。
 * - B03「点を結ぶ道」: 出発点から離れ、同じ保守的距離が100m以上になれば開く。この時、保存した出発点を削除する。歩いた経路の累計ではなく、原点からの距離を使う。
 * 使用API: high-accuracy Geolocation.watchPosition、Haversine距離、coordinates.accuracy、sessionStorage。5/25/100mを三円へ対応させた区分線形の尺度で、同じ判定距離を図示する。固定方向の印は距離の大きさだけを表し、方角/地図ではない。
 * 権限・privacy: 入場時に位置権限を使う。緯度/経度/accuracy/時刻の出発点を同一tab sessionへ保持し、再入場時は24時間未満だけ再利用、期限切れ読込時と全箱達成時に削除する。位置/距離を送信しない。storage不可時は現在のmemoryだけで測位を続ける。
 * 対応環境: secure contextでGeolocationの有限な座標/非負accuracyを提供し、端末を持って実際に移動できるbrowser/端末。
 */
function S590Stage(props: Props) {
  const problems = [
    props.boxes[manifest.box.B01],
    props.boxes[manifest.box.B02],
    props.boxes[manifest.box.B03],
  ] as const;
  const [solveFive, solveTwentyFive, solveHundred] = problems.map(
    (problem) => problem.solve,
  );
  const [meters, setMeters] = useState<number | null>(null);
  const [status, setStatus] = useState<CommonStatus>("waiting");
  useEffect(() => {
    let active = !props.signal.aborted;
    if (!active) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    let anchor: Anchor | null = null;
    try {
      anchor = storedAnchor(sessionStorage.getItem(anchorKey), Date.now());
      if (!anchor) removeAnchor();
    } catch {
      /* Use an in-memory anchor when storage is blocked. */
    }
    let watch: number | null = null;
    const dispose = () => {
      active = false;
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      watch = null;
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    try {
      watch = navigator.geolocation.watchPosition(
        (position) => {
          if (!active || props.signal.aborted) return;
          if (!validFix(position.coords)) {
            setMeters(null);
            setStatus("invalid");
            return;
          }
          if (!anchor) {
            anchor = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              at: Date.now(),
            };
            try {
              sessionStorage.setItem(anchorKey, JSON.stringify(anchor));
            } catch {
              /* Keep the measured anchor in memory. */
            }
          }
          const conservative = conservativeDistance(anchor, position.coords);
          setMeters(conservative);
          setStatus(conservative === null ? "invalid" : "active");
          if (conservative === null) return;
          if (conservative >= 5) solveFive?.();
          if (conservative >= 25) solveTwentyFive?.();
          if (conservative >= 100) {
            solveHundred?.();
            removeAnchor();
          }
        },
        (error) => {
          if (!active || props.signal.aborted) return;
          setMeters(null);
          setStatus(
            error.code === 1
              ? "denied"
              : error.code === 2
                ? "unavailable"
                : "error",
          );
        },
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
      if (!active) dispose();
    } catch {
      setMeters(null);
      setStatus("error");
      dispose();
    }
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal, solveFive, solveTwentyFive, solveHundred]);
  const radius = meters === null ? null : distanceRadius(meters);
  const offset = radius === null ? 0 : radius / Math.SQRT2;
  return (
    <div className="puzzle puzzle--centered">
      <div className="s590-field">
        <svg
          className="s590-map"
          viewBox="0 0 600 600"
          role="img"
          aria-label={stageText(props.locale, locale.diagram)}
        >
          <title>{stageText(props.locale, locale.diagram)}</title>
          {radii.map((r, index) => (
            <circle
              className="s590-ring"
              key={r}
              cx="300"
              cy="300"
              r={r}
              data-reached={
                meters !== null && meters >= (thresholds[index] ?? Infinity)
              }
            />
          ))}
          <circle cx="300" cy="300" r="5" fill="#b8a7d5" />
          <g
            className="s590-distance"
            data-observed={radius !== null}
            data-outside={meters !== null && meters > 100}
            visibility={radius === null ? "hidden" : "visible"}
            aria-hidden={radius === null || undefined}
          >
            <path
              d={`M300 300L${300 + offset} ${300 - offset}`}
              stroke="#c084fc"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <circle
              className="s590-indicator"
              cx={300 + offset}
              cy={300 - offset}
              r="7"
            />
            <path
              className="s590-overflow"
              visibility={
                meters !== null && meters > 100 ? "visible" : "hidden"
              }
              d={`M${300 + offset - 5} ${300 - offset - 12}l17 0 0 17`}
            />
          </g>
        </svg>
        {problems.map((problem, index) => (
          <div
            className="s590-box"
            key={problem.id}
            style={{
              left: `${(placements[index]?.x ?? 300) / 6}%`,
              top: `${(placements[index]?.y ?? 300) / 6}%`,
            }}
          >
            <StageProblemGiftBox box={problem} locale={props.locale} />
          </div>
        ))}
      </div>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: RouteOutlined,
      color: "#34d399",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: RouteOutlined,
      color: "#fbbf24",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: RouteOutlined,
      color: "#fb7185",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "geolocation" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S590Stage,
});
