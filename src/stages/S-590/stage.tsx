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

import { useEffect, useState } from "react";

interface Anchor {
  latitude: number;
  longitude: number;
  accuracy: number;
  at: number;
}
const anchorKey = "busycube:S-590:anchor";
function distance(a: Anchor, b: GeolocationCoordinates) {
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLon = (b.longitude - a.longitude) * radians;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * radians) *
      Math.cos(b.latitude * radians) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * S-590
 *
 * 目的: 最初の高精度geolocationを出発点としてsessionに保持し、測位誤差を差し引いて確実に移動した距離を三段階で集める。
 * 最初の一手: 位置情報を許可して最初の測位を待ち、端末を持って出発点からまず5 m以上、続いて25 m、100 m以上離れる。
 * 箱ごとの解法:
 * - B01「5mの箱」: 球面距離から出発点accuracyと現在accuracyを引いた保守的距離が5 m以上なら開く。
 * - B02「25mの箱」: 同じ保守的距離が25 m以上なら開く。この時B01も同時に条件を満たす。
 * - B03「100mの箱」: 同じ保守的距離が100 m以上なら開き、sessionStorageの出発点を削除する。
 * 使用API: Geolocation APIのhigh-accuracy `watchPosition()`、Haversine距離、GeolocationCoordinates accuracy、sessionStorage、`Date.now()`。
 * 権限・privacy: 位置権限を使用し、出発点の緯度・経度・accuracy・時刻を同一tab sessionに最大24時間だけ保存する。serverへ位置・移動距離を送信しない。
 * 対応環境: secure contextで高精度Geolocationとaccuracy値を提供し、実際に100 m以上移動できるmobile browser/端末。
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
  const [meters, setMeters] = useState(0);
  useEffect(() => {
    let anchor: Anchor | null = null;
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(anchorKey) ?? "null",
      ) as Anchor | null;
      if (stored && Date.now() - stored.at < 86400000) anchor = stored;
    } catch {
      sessionStorage.removeItem(anchorKey);
    }
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        if (!anchor) {
          anchor = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            at: Date.now(),
          };
          sessionStorage.setItem(anchorKey, JSON.stringify(anchor));
          return;
        }
        const conservative = Math.max(
          0,
          distance(anchor, position.coords) -
            anchor.accuracy -
            position.coords.accuracy,
        );
        setMeters(conservative);
        if (conservative >= 5) solveFive?.();
        if (conservative >= 25) solveTwentyFive?.();
        if (conservative >= 100) {
          solveHundred?.();
          sessionStorage.removeItem(anchorKey);
        }
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [solveFive, solveHundred, solveTwentyFive]);
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
      <p className="measurement">{meters.toFixed(1)}m</p>
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
