import "./styles.css";
import DevicesFoldOutlined from "@mui/icons-material/DevicesFoldOutlined";
import UnfoldLessOutlined from "@mui/icons-material/UnfoldLessOutlined";
import UnfoldMoreOutlined from "@mui/icons-material/UnfoldMoreOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type Posture = "continuous" | "folded";
interface DevicePosture extends EventTarget {
  readonly type: string;
}
function postureApi(): DevicePosture | undefined {
  return (navigator as Navigator & { devicePosture?: DevicePosture })
    .devicePosture;
}
function readPosture(): Posture | null {
  const type = postureApi()?.type;
  return type === "continuous" || type === "folded" ? type : null;
}

/**
 * S-320
 *
 * 目的: 入場時の物理postureを基準に、foldable端末の折り曲げ状態の変化を観測する。
 * 最初の一手: 画面の開閉アイコンを見て、実端末を開くか折り曲げる。
 * 箱ごとの解法:
 * - B02「折りたたみ画面」: 入場時がcontinuousなら端末をfoldedへ、foldedならcontinuousへ変える。実devicePosture.typeが最初の有効観測と異なる既知状態へ変化したら開く。初期folded・viewport二分割だけでは開かない。
 * 使用API: navigator.devicePostureとchangeイベント。
 * 権限・privacy: 権限を要求せず、最初と現在の二状態だけを挑戦中に保持し保存・送信しない。
 * 対応環境: Device Posture APIを公開するfoldable端末とブラウザー。
 */
function S320Stage(props: Props) {
  const problem = props.boxes.B02;
  const initial = useRef(readPosture());
  const [posture, setPosture] = useState(initial.current);
  useEffect(() => {
    const api = postureApi();
    if (!api) return;
    const inspect = () => {
      if (props.signal.aborted) return;
      const next = readPosture();
      if (!next) return;
      initial.current ??= next;
      setPosture(next);
      if (next !== initial.current) problem.solve();
    };
    api.addEventListener("change", inspect);
    inspect();
    const stop = () => api.removeEventListener("change", inspect);
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [problem.solve, props.signal]);
  const Direction =
    posture === "folded" ? UnfoldMoreOutlined : UnfoldLessOutlined;
  return (
    <div className="puzzle puzzle--centered">
      <div
        className="fold-preview"
        data-folded={posture === "folded"}
        aria-hidden="true"
      >
        <span />
        <i />
        <span />
      </div>
      <Direction className="fold-direction" aria-hidden="true" />
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: DevicesFoldOutlined,
      tone: "violet",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() => (postureApi() ? "available" : "unsupported")),
  Component: S320Stage,
});
