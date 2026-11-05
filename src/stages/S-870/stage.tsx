import "./styles.css";
import EditOutlined from "@mui/icons-material/EditOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { prepareDirectory, scanDirectory } from "./files";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { ReferenceArchive } from "./ReferenceArchive";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
function failure(error: unknown): CommonStatus {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") return "cancelled";
    if (error.name === "NotAllowedError" || error.name === "SecurityError")
      return "denied";
    if (error.name === "NotSupportedError") return "unavailable";
  }
  return "error";
}

/**
 * S-870
 *
 * 目的: 仮想書庫の一覧/内容を調査し、選択した空の実フォルダーをページ外の操作で同じ状態へ変える。
 * 最初の一手: 見本の書庫のfolder/fileを開いて調査し、読み書きの案内を読んで使い捨ての空フォルダーを選ぶ。
 * 箱ごとの解法:
 * - B01「鉛筆」: 実フォルダーのrewrite-me.txtを外部エディターで見本の内容へ変更する。File.text()がbusycube{edited_outside_the_page}と末尾LF一個に完全一致すれば開く。UTF-8 BOMはFile.text()の復号に従って許容し、CRLF/末尾改行なし/追加文字は一致しない。
 * - B02「斜線入りの目」: 実フォルダーのdelete-me.txtを外部のファイル管理で削除し、再走査のgetFileHandleでNotFoundErrorになれば開く。権限エラーや同名directoryを削除成功と扱わない。
 * - B03「紙と上向き矢印」: 実フォルダーにcreate-me.txtという通常ファイルを外部で作成し、File.size>0なら開く。見本の作成ファイル内容への完全一致は要求しない。
 * 使用API: showDirectoryPicker({mode:readwrite})、directory.values/getFileHandle、getFile/createWritable、File.text/size。見本は調査だけのReact UIで実フォルダーを操作せず、実状態を表示中の一秒間隔とfocus/visibility復帰で再読込する。
 * 権限・privacy: 空を確認した選択フォルダーへだけ二つのseedをUTF-8 BOM/LFで書く。handleと照合用内容は一時memoryのみで保存・送信せず、実ファイルの変更/削除をゲームから代行しない。使い捨てfolderの読み書き同意/OSでの後片付け案内を維持する。
 * 対応環境: secure contextでFile System Accessのdirectory pickerとreadwrite handleを提供するbrowser。
 */
function S870Stage(props: Props) {
  const directory = useRef<FileSystemDirectoryHandle | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const choosing = useRef(false);
  const opened = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const rewrite = props.boxes[manifest.box.B01].solve;
  const remove = props.boxes[manifest.box.B02].solve;
  const create = props.boxes[manifest.box.B03].solve;
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const stop = () => {
      controller.abort();
      directory.current = null;
    };
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) stop();
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
      if (lifetime.current === controller) lifetime.current = null;
    };
  }, [props.signal]);
  useEffect(() => {
    const owner = lifetime.current;
    let active = true;
    let checking = false;
    const check = async () => {
      const folder = directory.current;
      if (
        !owner ||
        owner.signal.aborted ||
        !active ||
        !folder ||
        document.visibilityState !== "visible" ||
        checking ||
        choosing.current
      )
        return;
      checking = true;
      try {
        const result = await scanDirectory(folder, owner.signal);
        if (
          !active ||
          owner.signal.aborted ||
          folder !== directory.current ||
          choosing.current
        )
          return;
        let changed = false;
        for (const [id, hit, solve] of [
          [manifest.box.B01, result.rewrite, rewrite],
          [manifest.box.B02, result.deleted, remove],
          [manifest.box.B03, result.created, create],
        ] as const) {
          if (hit && !opened.current.has(id)) {
            opened.current.add(id);
            solve();
            changed = true;
          }
        }
        if (result.error)
          setStatus(statusText(props.locale, failure(result.error)));
        else if (changed)
          setStatus(
            statusText(
              props.locale,
              opened.current.size === 3 ? "success" : "matched",
            ),
          );
      } catch (error) {
        if (active && !owner.signal.aborted)
          setStatus(statusText(props.locale, failure(error)));
      } finally {
        checking = false;
      }
    };
    const resume = () => void check();
    const timer = ready ? setInterval(resume, 1000) : undefined;
    if (ready) {
      window.addEventListener("focus", resume);
      document.addEventListener("visibilitychange", resume);
      resume();
    }
    const stop = () => {
      active = false;
      if (timer !== undefined) clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
    owner?.signal.addEventListener("abort", stop, { once: true });
    if (owner?.signal.aborted) stop();
    return () => {
      owner?.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.locale, ready, rewrite, remove, create]);
  const choose = async () => {
    const owner = lifetime.current;
    if (!owner || owner.signal.aborted || choosing.current) return;
    choosing.current = true;
    setBusy(true);
    setStatus(statusText(props.locale, "waiting"));
    try {
      if (!window.showDirectoryPicker) {
        setStatus(statusText(props.locale, "unavailable"));
        return;
      }
      const selected = await window.showDirectoryPicker({ mode: "readwrite" });
      if (owner.signal.aborted) return;
      const empty = await prepareDirectory(selected, owner.signal);
      if (owner.signal.aborted) return;
      if (!empty) {
        setStatus(stageText(props.locale, locale.nonEmpty));
        return;
      }
      directory.current = selected;
      setReady(true);
      setStatus(stageText(props.locale, locale.ready));
    } catch (error) {
      if (!owner.signal.aborted)
        setStatus(statusText(props.locale, failure(error)));
    } finally {
      choosing.current = false;
      if (!owner.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="puzzle s870-stage">
      <div className="problem-row">
        {manifest.boxIds.map((id) => (
          <StageProblemGiftBox
            key={id}
            box={props.boxes[id]}
            locale={props.locale}
          />
        ))}
      </div>
      <ReferenceArchive language={props.locale} />
      <p>{stageText(props.locale, locale.intro)}</p>
      <button
        type="button"
        className="stage-action"
        disabled={busy}
        onClick={() => void choose()}
      >
        {stageText(props.locale, locale.choose)}
      </button>
      <p className="interaction-status" role="status">
        {status}
      </p>
      <small>{stageText(props.locale, locale.cleanup)}</small>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: EditOutlined,
      color: "#34d399",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: VisibilityOffOutlined,
      color: "#10b981",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: FileUploadOutlined,
      color: "#059669",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "showDirectoryPicker" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S870Stage,
});
