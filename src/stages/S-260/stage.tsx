import "./styles.css";
import ColorizeOutlined from "@mui/icons-material/ColorizeOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
type EyeDropperApi = new () => {
  open(options: { signal: AbortSignal }): Promise<{ sRGBHex: string }>;
};
const target = "#a78bfa";

/**
 * S-260
 *
 * 目的: 色コードを手掛かりに、画面から実EyeDropperで同じ色を持ち帰る。
 * 最初の一手: 箱の近くの目標コードを読み、箱を押してスポイトを起動する。
 * 箱ごとの解法:
 * - B01「スポイト」: 目標#a78bfaの色を別ページや外部ツール等に表示し、箱から起動した実EyeDropperで採る。返ったsRGBHexの小文字化した値が#a78bfaへ完全一致すると開く。選択位置は制限しない。
 * 使用API: EyeDropper.open、AbortSignal。
 * 権限・privacy: 明示操作だけで標準pickerを開き、選択した色コードと小さな見本だけを表示する。画面画像/座標を保存・送信しない。
 * 対応環境: secure contextでEyeDropperとbrowser所有のpickerを提供するbrowser。
 */
function S260Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [picked, setPicked] = useState<string>();
  const [status, setStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const solved = useRef(false);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    const abort = () => current.abort();
    props.signal.addEventListener("abort", abort, { once: true });
    if (props.signal.aborted) abort();
    return () => {
      props.signal.removeEventListener("abort", abort);
      abort();
    };
  }, [props.signal]);
  const pick = async () => {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || busy.current || solved.current) return;
    if (!("EyeDropper" in window) || typeof window.EyeDropper !== "function") {
      setStatus("unavailable");
      return;
    }
    busy.current = true;
    try {
      // lib.dom does not yet declare this browser-owned API.
      const Api = window.EyeDropper as EyeDropperApi;
      const result = await new Api().open({ signal });
      if (signal.aborted) return;
      const value = result.sRGBHex.toLowerCase();
      if (!/^#[a-f0-9]{6}$/.test(value)) {
        setStatus("invalid");
        return;
      }
      setPicked(value);
      setStatus("read");
      if (value === target) {
        solved.current = true;
        problem.solve();
      }
    } catch (error) {
      if (signal.aborted) return;
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "cancelled"
          : error instanceof DOMException && error.name === "NotAllowedError"
            ? "denied"
            : error instanceof DOMException &&
                error.name === "NotSupportedError"
              ? "unavailable"
              : "error",
      );
    } finally {
      busy.current = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={() => void pick()}
      />
      <code className="measurement s260-target">{target}</code>
      {picked && (
        <output className="s260-picked">
          <span
            className="s260-swatch"
            style={{ backgroundColor: picked }}
            aria-hidden="true"
          />
          <code>{picked}</code>
        </output>
      )}
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ColorizeOutlined,
      color: "#22d3ee",
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
