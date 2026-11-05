import "./styles.css";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import ContentPasteOutlined from "@mui/icons-material/ContentPasteOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-180
 *
 * 目的: clipboardへ渡した逆順文字列を外部で直し、実write成功後の実readで返す。
 * 最初の一手: 中央のcopyアイコンを押し、外部editorへ貼り付けて内容を確かめる。
 * 箱ごとの解法:
 * - B01「貼り付け」: copyアイコンで実writeTextにebucysubを渡し、外部でbusycubeへ直してcopyする。その後箱を押して実readTextし、今回のwrite成功後に開始したreadが厳密にbusycubeなら開く。空白/改行/大小文字は補正しない。
 * 使用API: navigator.clipboard.writeText/readText。
 * 権限・privacy: 明示操作だけでclipboardを読書きし、自動監視しない。問題文字列はページに表示せず、無関係な内容を保存・表示・送信しない。
 * 対応環境: secure contextでAsync Clipboardを提供し、読書きを許可するbrowser。拒否/未対応は失敗と区別する。
 */
function S180Stage(props: Props) {
  const armed = useRef(false);
  const solved = useRef(false);
  const active = useRef(true);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const current = () => active.current && !props.signal.aborted;
  const fail = (error: unknown) => {
    if (current())
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "denied"
          : "error",
      );
  };
  const copy = async () => {
    if (!current()) return;
    if (!navigator.clipboard?.writeText) {
      setStatus("unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText("ebucysub");
      if (!current()) return;
      armed.current = true;
      setCopied(true);
      setStatus("");
    } catch (error) {
      fail(error);
    }
  };
  const inspect = async () => {
    if (!current()) return;
    if (!navigator.clipboard?.readText) {
      setStatus("unavailable");
      return;
    }
    const writtenBeforeRead = armed.current;
    try {
      const value = await navigator.clipboard.readText();
      if (!current()) return;
      if (writtenBeforeRead && value === "busycube") {
        if (!solved.current) {
          solved.current = true;
          props.boxes[manifest.box.B01].solve();
        }
        setStatus("");
      } else setStatus("invalid");
    } catch (error) {
      fail(error);
    }
  };
  return (
    <div className="puzzle puzzle--centered s180-stage">
      <button
        type="button"
        className="stage-action s180-copy"
        data-copied={copied}
        aria-label={stageText(props.locale, locale.copy)}
        onClick={() => void copy()}
      >
        {copied ? <CheckOutlined /> : <ContentCopyOutlined />}
      </button>
      <span className="sr-only" role="status">
        {copied ? stageText(props.locale, locale.copied) : ""}
      </span>
      <StageProblemGiftBox
        box={props.boxes[manifest.box.B01]}
        locale={props.locale}
        onClick={() => void inspect()}
      />
      {status ? <p role="status">{statusText(props.locale, status)}</p> : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ContentPasteOutlined,
      color: "#a78bfa",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      typeof navigator.clipboard?.readText === "function" &&
      typeof navigator.clipboard?.writeText === "function"
        ? "permission-required"
        : "unsupported",
    ),
  Component: S180Stage,
});
