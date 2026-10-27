import "./styles.css";
import AspectRatioOutlined from "@mui/icons-material/AspectRatioOutlined";
import { useEffect, useMemo, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-020
 *
 * 目的: stage入場時のviewport幅から80 CSS px離れた目標へ、実際のbrowser viewportをresizeして合わせる。
 * 最初の一手: ゲージの目標帯を見て、browser windowの端をdragする。
 * 箱ごとの解法:
 * - B01「縦横の枠」: ゲージの目標帯へブラウザーの窓端をドラッグする。`resize`後の`window.innerWidth`を目標値の±18 px以内にすると開く。初期幅420 px以下では+80 px、それ以外では-80 pxが目標になる。
 * 使用API: `window.innerWidth`、Windowの`resize` event。capability判定では`ResizeObserver`の有無も確認する。
 * 権限・privacy: 権限を要求せず、現在幅と入場時に算出した目標幅は画面内の判定にだけ使い、保存・送信しない。
 * 対応環境: `ResizeObserver`を備え、windowまたはviewport幅を利用者が変更できるdesktop browser等。
 */
function S020Stage(props: Props) {
  const initialWidth = useRef(window.innerWidth);
  const targetWidth = useMemo(
    () =>
      initialWidth.current <= 420
        ? initialWidth.current + 80
        : initialWidth.current - 80,
    [],
  );
  const [width, setWidth] = useState(window.innerWidth);
  const [screenWidth, setScreenWidth] = useState(window.screen.width);
  const box = props.boxes[manifest.box.B01];
  const meterMax = Math.max(1, screenWidth);
  const low = Math.max(0, targetWidth - 18);
  const high = Math.min(meterMax, targetWidth + 18);

  useEffect(() => {
    const observe = () => {
      const nextWidth = window.innerWidth;
      setWidth(nextWidth);
      setScreenWidth(window.screen.width);
      if (Math.abs(nextWidth - targetWidth) <= 18) box.solve();
    };
    window.addEventListener("resize", observe);
    props.signal.addEventListener(
      "abort",
      () => window.removeEventListener("resize", observe),
      { once: true },
    );
    return () => window.removeEventListener("resize", observe);
  }, [box, props.signal, targetWidth]);

  return (
    <div className="puzzle puzzle--centered">
      <div className="resize-ruler">
        <meter
          aria-label={stageText(props.locale, locale.gauge)}
          min={0}
          max={meterMax}
          low={Math.min(meterMax, low)}
          high={Math.max(0, high)}
          optimum={Math.min(meterMax, targetWidth)}
          value={Math.min(meterMax, width)}
        />
        <span
          className="resize-ruler__target"
          aria-hidden="true"
          style={{
            left: `${(Math.min(meterMax, low) / meterMax) * 100}%`,
            width: `${(Math.max(0, high - low) / meterMax) * 100}%`,
          }}
        />
        <span
          className="resize-ruler__optimum"
          aria-hidden="true"
          style={{
            left: `${(Math.min(meterMax, targetWidth) / meterMax) * 100}%`,
          }}
        />
      </div>
      <StageProblemGiftBox box={box} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: AspectRatioOutlined,
      color: "#818cf8",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "ResizeObserver" in window ? "available" : "unsupported",
    ),
  Component: S020Stage,
});
