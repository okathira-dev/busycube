import EditOutlined from "@mui/icons-material/EditOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

const replacementText = "busycube{edited_outside_the_page}\n";

async function directoryIsEmpty(directory: FileSystemDirectoryHandle) {
  for await (const _entry of directory.values()) return false;
  return true;
}

async function writeText(
  directory: FileSystemDirectoryHandle,
  name: string,
  text: string,
) {
  const file = await directory.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(`\uFEFF${text}`);
  await writable.close();
}

async function isMissing(directory: FileSystemDirectoryHandle, name: string) {
  try {
    await directory.getFileHandle(name);
    return false;
  } catch (error: unknown) {
    return (error as DOMException).name === "NotFoundError";
  }
}

/**
 * S-870 — OSで書き換わるフォルダー
 *
 * 目的: 選択した空フォルダーへゲームが用意したファイルを、ページ外のファイル管理・編集操作で変化させ、その実体を再読込する。
 * 最初の一手: 「空のフォルダーを選ぶ」を押し、削除してよい新規の空フォルダーを読み書き可能として選ぶ。ゲームが`rewrite-me.txt`と`delete-me.txt`を作った後、OS側で操作する。
 * 箱ごとの解法:
 * - B01: OSのテキストエディターで`rewrite-me.txt`を開き、内容を`busycube{edited_outside_the_page}`と末尾改行だけにして保存する。画面へ戻った時の`File.text()`がその文字列と完全一致すると開く。
 * - B02: OSのファイル管理画面で`delete-me.txt`を削除する。画面へ戻った再走査で`getFileHandle("delete-me.txt")`が`NotFoundError`になると開く。
 * - B03: 同じフォルダーへ`create-me.txt`という通常ファイルを新規作成し、1 byte以上の内容を保存する。再走査した`File.size`が0より大きいと開く。
 * 使用API: File System Access APIの`showDirectoryPicker({mode:"readwrite"})`、`FileSystemDirectoryHandle`、`getFileHandle()`、`createWritable()`、`File.text()`、`File.size`。
 * 権限・privacy: 空であることを確認した選択フォルダーだけへseedファイルを書き、handleはmemory内だけに保持する。ファイル内容やhandleを保存・送信しない。
 * 対応環境: secure contextでFile System Access APIのdirectory pickerとread/write handleを提供するChromium系browser。
 */
function S870Stage(props: Props) {
  const rewriteProblem = props.boxes[manifest.box.B01];
  const deleteProblem = props.boxes[manifest.box.B02];
  const createProblem = props.boxes[manifest.box.B03];
  const directoryRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let interval: number | undefined;
    let checking = false;
    const check = async () => {
      const directory = directoryRef.current;
      if (!directory || document.visibilityState !== "visible" || checking)
        return;
      checking = true;
      try {
        const [rewriteResult, createdResult, deleted] = await Promise.all([
          directory
            .getFileHandle("rewrite-me.txt")
            .then((handle) => handle.getFile())
            .catch(() => undefined),
          directory
            .getFileHandle("create-me.txt")
            .then((handle) => handle.getFile())
            .catch(() => undefined),
          isMissing(directory, "delete-me.txt"),
        ]);
        if (rewriteResult && (await rewriteResult.text()) === replacementText) {
          rewriteProblem.solve();
        }
        if (deleted) deleteProblem.solve();
        if (createdResult && createdResult.size > 0) createProblem.solve();
        setStatus(stageText(props.locale, locale.checking));
      } catch {
        // A partially completed external edit is expected; keep the watcher alive.
      } finally {
        checking = false;
      }
    };
    const resume = () => void check();
    if (ready) {
      interval = window.setInterval(() => void check(), 1000);
      window.addEventListener("focus", resume);
      document.addEventListener("visibilitychange", resume);
      void check();
    }
    const stop = () => {
      if (interval !== undefined) window.clearInterval(interval);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [
    createProblem.solve,
    deleteProblem.solve,
    props.locale,
    props.signal,
    ready,
    rewriteProblem.solve,
  ]);

  const chooseDirectory = async () => {
    if (!window.showDirectoryPicker) return;
    setStatus(stageText(props.locale, locale.choosing));
    try {
      const directory = await window.showDirectoryPicker({ mode: "readwrite" });
      if (!(await directoryIsEmpty(directory))) {
        setStatus(stageText(props.locale, locale.nonEmpty));
        return;
      }
      await Promise.all([
        writeText(directory, "rewrite-me.txt", "replace this line\n"),
        writeText(directory, "delete-me.txt", "delete this file\n"),
      ]);
      directoryRef.current = directory;
      setReady(true);
      setStatus(stageText(props.locale, locale.ready));
    } catch (error: unknown) {
      if ((error as DOMException).name === "AbortError") {
        setStatus(stageText(props.locale, locale.cancelled));
      } else {
        setStatus(stageText(props.locale, locale.unsupported));
      }
    }
  };

  return (
    <div className="puzzle s870-stage">
      <div className="problem-row">
        <StageProblemGiftBox box={rewriteProblem} locale={props.locale} />
        <StageProblemGiftBox box={deleteProblem} locale={props.locale} />
        <StageProblemGiftBox box={createProblem} locale={props.locale} />
      </div>
      <p>{stageText(props.locale, locale.intro)}</p>
      <button
        type="button"
        className="stage-action"
        onClick={() => void chooseDirectory()}
      >
        {stageText(props.locale, locale.choose)}
      </button>
      {ready ? (
        <ol className="s870-jobs">
          <li>
            <strong>{stageText(props.locale, locale.rewrite)}</strong>
            <code>{stageText(props.locale, locale.rewriteInstruction)}</code>
          </li>
          <li>
            <strong>{stageText(props.locale, locale.remove)}</strong>
          </li>
          <li>
            <strong>{stageText(props.locale, locale.create)}</strong>
            <span>{stageText(props.locale, locale.createInstruction)}</span>
          </li>
        </ol>
      ) : null}
      <output className="interaction-status" aria-live="polite">
        {status}
      </output>
      {ready ? <small>{stageText(props.locale, locale.cleanup)}</small> : null}
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
