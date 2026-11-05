import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import { type ChangeEvent, useRef, useState } from "react";
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
 * S-130
 *
 * 目的: 外へ取り出した文字列を外部で並べ替え、保存した実ファイルの内容を読み戻す。
 * 最初の一手: 中央のダウンロードアイコンからテキストファイルを保存し、外部で中身を調べる。
 * 箱ごとの解法:
 * - B03「紙と上向き矢印」: ダウンロードしたucbeybsuを外部editorでbusycubeへ並べ替えて保存し、箱からファイルを選ぶ。実File.text()がbusycubeへ完全一致すれば開く。末尾の改行のみ許容し、空白・大小文字の違いは許容しない。
 * 使用API: Blob URL、download属性付きanchor、File API、native file picker。
 * 権限・privacy: 利用者が選んだ4,096 byte以下のファイルだけを判定し、内容を保存・表示・送信しない。
 * 対応環境: Blob URLのダウンロードとfile inputを利用できるブラウザー。
 */
function S130Stage(props: Props) {
  const problem = props.boxes.B03;
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const download = () => {
    const blob = new Blob(["ucbeybsu"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "puzzle.txt";
    link.click();
    URL.revokeObjectURL(url);
  };
  const inspect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 4096) {
      setStatus("invalid");
      return;
    }
    try {
      const text = await file.text();
      if (props.signal.aborted) return;
      if (text.replace(/[\r\n]+$/, "") !== "busycube") {
        setStatus("invalid");
        return;
      }
      problem.solve();
      setStatus("matched");
    } catch {
      if (!props.signal.aborted) setStatus("invalid");
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <button
        type="button"
        className="stage-action"
        aria-label={stageText(props.locale, locale.download)}
        onClick={download}
      >
        <FileDownloadOutlined aria-hidden="true" />
      </button>
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={() => input.current?.click()}
      />
      <input
        ref={input}
        type="file"
        hidden
        aria-label={stageText(props.locale, locale.file)}
        onChange={(event) => void inspect(event)}
      />
      <p role="status">{status ? statusText(props.locale, status) : null}</p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: FileUploadOutlined,
      tone: "green",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      typeof URL.createObjectURL === "function" && "File" in window
        ? "available"
        : "unsupported",
    ),
  Component: S130Stage,
});
