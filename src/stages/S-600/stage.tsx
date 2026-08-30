import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";

/**
 * S-600
 *
 * 目的: geolocationのaltitude±altitudeAccuracyが境界をまたがない時だけ、高度を100 m未満・100〜500 m・500 m以上へ分類する。
 * 最初の一手: 位置情報を許可し、高度とaltitude accuracyを返す端末で同じ高度帯に5秒以上留まる。別の帯は実際に標高を変えて再訪する。
 * 箱ごとの解法:
 * - B01「100m未満の箱」: `altitude + altitudeAccuracy < 100`の同一band readingを3回以上、最初から5,000 ms以上維持すると開く。
 * - B02「100〜500mの箱」: `altitude - accuracy >= 100`かつ`altitude + accuracy < 500`を同じ安定条件で満たすと開く。
 * - B03「500m以上の箱」: `altitude - altitudeAccuracy >= 500`を同じ安定条件で満たすと開く。境界を跨ぐaccuracy範囲ではcountをresetする。
 * 使用API: Geolocation APIのhigh-accuracy `watchPosition()`、coordinates altitude/altitudeAccuracy、`performance.now()`。
 * 権限・privacy: 位置権限を使用するが、緯度・経度は読まず、現在高度・accuracyと安定countだけをmemory上で判定する。位置・高度を保存・送信しない。
 * 対応環境: secure contextでGeolocationが非nullのaltitudeとaltitudeAccuracyを継続提供するGNSS対応browser/端末。
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
  const stable = useRef({ band: -1, count: 0, since: 0 });
  const [altitude, setAltitude] = useState<number | null>(null);
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const value = position.coords.altitude;
        const accuracy = position.coords.altitudeAccuracy;
        if (value === null || accuracy === null) return;
        setAltitude(value);
        const low = value - accuracy;
        const high = value + accuracy;
        const band =
          high < 100 ? 0 : low >= 100 && high < 500 ? 1 : low >= 500 ? 2 : -1;
        if (band < 0) {
          stable.current = { band: -1, count: 0, since: 0 };
          return;
        }
        if (stable.current.band !== band)
          stable.current = { band, count: 1, since: performance.now() };
        else stable.current.count += 1;
        if (
          stable.current.count >= 3 &&
          performance.now() - stable.current.since >= 5000
        )
          if (band === 0) solveLow?.();
          else if (band === 1) solveMiddle?.();
          else solveHigh?.();
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [solveHigh, solveLow, solveMiddle]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {problems.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <p className="measurement">
        {altitude === null ? "…" : `${altitude.toFixed(1)}m`}
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
