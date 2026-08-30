import DevicesFoldOutlined from "@mui/icons-material/DevicesFoldOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

interface BusyDevicePosture extends EventTarget {
  type: string;
}

interface PostureNavigator extends Navigator {
  devicePosture?: BusyDevicePosture;
}

/**
 * S-320
 *
 * 目的: foldable deviceの物理postureまたはhingeで分割された二つのviewport segmentをbrowserの公開値から観測する。
 * 最初の一手: foldable端末でappをhingeをまたぐように表示し、端末を折り曲げるか二画面span modeへ切り替える。
 * 箱ごとの解法:
 * - B01「折れ目の箱」: 入場時またはchange時に`navigator.devicePosture.type === "folded"`、horizontal segment数2、vertical segment数2のいずれかを満たすと開く。
 * 使用API: Device Posture APIの`navigator.devicePosture`、CSS Viewport Segments media query、`matchMedia()` change event。
 * 権限・privacy: 権限を要求せず、folded/continuousとsegment数1/2だけを現在表示・判定に使い、端末形状を保存・送信しない。
 * 対応環境: Device Posture APIまたはviewport segment環境変数/media featureを公開するfoldable・dual-screen browser/端末。
 */
function S320Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [posture, setPosture] = useState("continuous");
  const [segments, setSegments] = useState(1);

  const inspect = useCallback(() => {
    const devicePosture = (navigator as unknown as PostureNavigator)
      .devicePosture;
    const horizontal = window.matchMedia("(horizontal-viewport-segments: 2)");
    const vertical = window.matchMedia("(vertical-viewport-segments: 2)");
    const nextSegments = horizontal.matches || vertical.matches ? 2 : 1;
    const nextPosture = devicePosture?.type ?? "continuous";
    setSegments(nextSegments);
    setPosture(nextPosture);
    if (nextPosture === "folded" || nextSegments === 2) {
      problem.solve();
    }
  }, [problem.solve]);

  useEffect(() => {
    const devicePosture = (navigator as unknown as PostureNavigator)
      .devicePosture;
    const queries = [
      window.matchMedia("(horizontal-viewport-segments: 2)"),
      window.matchMedia("(vertical-viewport-segments: 2)"),
    ];
    devicePosture?.addEventListener("change", inspect);
    for (const query of queries) query.addEventListener("change", inspect);
    inspect();
    const cleanup = () => {
      devicePosture?.removeEventListener("change", inspect);
      for (const query of queries) query.removeEventListener("change", inspect);
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [inspect, props.signal]);

  return (
    <div className="puzzle puzzle--centered">
      <div
        className="fold-preview"
        data-folded={posture === "folded" || segments === 2}
      >
        <span />
        <i aria-hidden="true" />
        <span />
      </div>
      <p className="measurement">
        {stageText(
          props.locale,
          posture === "folded" ? locale.folded : locale.continuous,
        )}{" "}
        · {segments} {stageText(props.locale, locale.segment)}
      </p>
      <p className="interaction-status" role="status">
        {stageText(props.locale, locale.foldHint)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: DevicesFoldOutlined,
      color: "#c084fc",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "devicePosture" in navigator ||
      CSS.supports("top: env(viewport-segment-top 0 0)")
        ? "available"
        : "unsupported",
    ),
  Component: S320Stage,
});
