import ColorizeOutlined from "@mui/icons-material/ColorizeOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

type PeripheralStatus = "idle" | "read" | "cancelled" | "unavailable";

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}

interface EyeDropperWindow extends Window {
  EyeDropper: new () => EyeDropperInstance;
}

const EYEDROPPER_TARGET = "#a78bfa";

/**
 * S-260
 *
 * 目的: browser標準のeyedropperで画面上の実pixelを選び、stageが示す紫色と完全一致するsRGB値を得る。
 * 最初の一手: 紫色の丸または「一滴を採る」を押してeyedropperを起動し、画面内の紫色target中央を選ぶ。
 * 箱ごとの解法:
 * - B01「色を採る箱」: EyeDropperが返した`sRGBHex`を小文字化した値がtarget色`#a78bfa`と完全一致すると開く。
 * 使用API: EyeDropper APIの`new EyeDropper().open()`とAbortSignal。
 * 権限・privacy: eyedropperは利用者操作時だけ起動し、選択した1 pixelのsRGB hexだけを現在表示する。screen画像や選択位置を保存・送信しない。
 * 対応環境: secure contextでEyeDropper APIとbrowser所有のcolor picker UIを提供するbrowser。
 */
function S260Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [picked, setPicked] = useState("—");
  const [status, setStatus] = useState<PeripheralStatus>("idle");

  const pick = async () => {
    try {
      const EyeDropperApi = (window as unknown as EyeDropperWindow).EyeDropper;
      const result = await new EyeDropperApi().open({ signal: props.signal });
      if (props.signal.aborted) return;
      const normalized = result.sRGBHex.toLowerCase();
      setPicked(normalized);
      setStatus("read");
      if (normalized === EYEDROPPER_TARGET) {
        problem.solve();
      }
    } catch (error) {
      if (props.signal.aborted) return;
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "cancelled"
          : "unavailable",
      );
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <button
        type="button"
        className="eyedropper-target"
        style={{ background: EYEDROPPER_TARGET }}
        onClick={() => void pick()}
        aria-label={stageText(props.locale, locale.purpleTarget)}
      />
      <button
        type="button"
        className="stage-action"
        onClick={() => void pick()}
      >
        {stageText(props.locale, locale.pickDrop)}
      </button>
      <p className="measurement">{picked}</p>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ColorizeOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "EyeDropper" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S260Stage,
});
