import AspectRatioOutlined from "@mui/icons-material/AspectRatioOutlined";
import { useEffect, useMemo, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-020
 *
 * 目的: stage入場時のviewport幅から80 CSS px離れた目標へ、実際のbrowser viewportをresizeして合わせる。
 * 最初の一手: 表示された「現在幅 → 目標幅」を見て、browser windowの端を目標方向へdragする。
 * 箱ごとの解法:
 * - B01「幅合わせの箱」: `resize`後の`window.innerWidth`を目標値の±18 px以内にすると開く。初期幅420 px以下では+80 px、それ以外では-80 pxが目標になる。
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
  const box = props.boxes[manifest.box.B01];
  const meterMin = Math.min(initialWidth.current, targetWidth) - 100;
  const meterMax = Math.max(initialWidth.current, targetWidth) + 100;

  useEffect(() => {
    const observe = () => {
      const nextWidth = window.innerWidth;
      setWidth(nextWidth);
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
      <div className="resize-ruler" aria-hidden="true">
        <span
          className="resize-ruler__fill"
          style={{ width: `${Math.min(100, (width / targetWidth) * 100)}%` }}
        />
      </div>
      <p className="measurement" aria-live="polite">
        {width} → {targetWidth}
      </p>
      <meter
        min={meterMin}
        max={meterMax}
        optimum={targetWidth}
        value={Math.min(meterMax, Math.max(meterMin, width))}
      >
        {width}
      </meter>
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
