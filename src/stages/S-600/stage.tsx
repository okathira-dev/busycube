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
  type AltitudeObservation,
  altitudeY,
  observeAltitude,
} from "./altitude";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const boxY = [340, 210, 70];

/**
 * S-600
 *
 * 目的: 実Geolocationの高度を三層と現在高度の精度範囲で示し、異なる高度帯の観測を集める。
 * 最初の一手: 入場時に位置情報を許可し、高度と精度が得られる端末で図の反応を見る。
 * 箱ごとの解法:
 * - B01「点を結ぶ道」: 高度100m未満の場所を訪れ、実altitude + altitudeAccuracy < 100の観測一回で開く。
 * - B02「点を結ぶ道」: 高度100m以上500m未満の場所を訪れ、実altitude - altitudeAccuracy >= 100かつaltitude + altitudeAccuracy < 500の観測一回で開く。
 * - B03「点を結ぶ道」: 高度500m以上の場所を訪れ、実altitude - altitudeAccuracy >= 500の観測一回で開く。高度/非負精度/両端は有限値が必要で、境界をまたぐ精度範囲では達成しない。精度条件は最終採否が未確定のため既存条件を維持する。
 * 使用API: high-accuracy Geolocation.watchPosition、coordinates.altitude/altitudeAccuracy。初回を含む実観測で判定し、出発点との差や継続時間は使わない。図の点と範囲は同じ高度尺度へ写し、境界をまたぐ時は点を中空で示す。
 * 権限・privacy: 入場時に位置権限を使うが緯度/経度は読まない。直近の高度と精度範囲だけをmemoryに持ち、位置/高度を保存・送信しない。
 * 対応環境: secure contextでGeolocationが高度とaltitudeAccuracyを提供するbrowser/端末。
 */
function S600Stage(props: Props) {
  const problems = [
    props.boxes[manifest.box.B01],
    props.boxes[manifest.box.B02],
    props.boxes[manifest.box.B03],
  ] as const;
  const [solveLow, solveMiddle, solveHigh] = problems.map(
    (problem) => problem.solve,
  );
  const [observation, setObservation] = useState<AltitudeObservation | null>(
    null,
  );
  const [status, setStatus] = useState<CommonStatus>("waiting");
  useEffect(() => {
    let active = !props.signal.aborted;
    if (!active) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
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
          const altitude = position.coords.altitude;
          const accuracy = position.coords.altitudeAccuracy;
          const next = observeAltitude(altitude, accuracy);
          setObservation(next);
          setStatus(
            next
              ? "active"
              : altitude === null || accuracy === null
                ? "waiting"
                : "invalid",
          );
          if (next?.band === 0) solveLow?.();
          else if (next?.band === 1) solveMiddle?.();
          else if (next?.band === 2) solveHigh?.();
        },
        (error) => {
          if (!active || props.signal.aborted) return;
          setObservation(null);
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
      setObservation(null);
      setStatus("error");
      dispose();
    }
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal, solveLow, solveMiddle, solveHigh]);
  const y = observation ? altitudeY(observation.altitude) : 210;
  const top = observation ? altitudeY(observation.high) : 210;
  const bottom = observation ? altitudeY(observation.low) : 210;
  return (
    <div className="puzzle puzzle--centered">
      <div className="s600-field">
        <svg
          className="s600-diagram"
          viewBox="0 0 560 420"
          role="img"
          aria-label={stageText(props.locale, locale.diagram)}
        >
          <title>{stageText(props.locale, locale.diagram)}</title>
          <rect className="s600-layer" x="60" y="20" width="440" height="120" />
          <rect
            className="s600-layer"
            x="60"
            y="140"
            width="440"
            height="140"
          />
          <rect
            className="s600-layer"
            x="60"
            y="280"
            width="440"
            height="120"
          />
          <g
            className="s600-reading"
            data-observed={observation !== null}
            data-qualified={observation !== null && observation.band !== null}
            visibility={observation ? "visible" : "hidden"}
            aria-hidden={!observation || undefined}
          >
            <path
              className="s600-uncertainty"
              d={`M170 ${top}V${bottom}M158 ${top}h24M158 ${bottom}h24`}
            />
            <circle className="s600-marker" cx="170" cy={y} r="8" />
            <path
              className="s600-uncertainty"
              visibility={
                observation && observation.high > 1000 ? "visible" : "hidden"
              }
              d="m163 34 7-7 7 7"
            />
            <path
              className="s600-uncertainty"
              visibility={
                observation && observation.low < -100 ? "visible" : "hidden"
              }
              d="m163 386 7 7 7-7"
            />
          </g>
        </svg>
        {problems.map((problem, index) => (
          <div
            className="s600-box"
            key={problem.id}
            style={{
              left: `${(390 / 560) * 100}%`,
              top: `${((boxY[index] ?? 210) / 420) * 100}%`,
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
      color: "#60a5fa",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "geolocation" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S600Stage,
});
