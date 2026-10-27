import "./styles.css";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { filePayload, fileRound, fileTarget, pendingKey } from "./fileKey";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-440
 * 目的: OSからインストール済みBusycubeへ専用ファイルを渡し、実LaunchQueue.filesの内容と今回の識別値を照合する。
 * 最初の一手: 紙と下向き矢印の箱からkey.busycubeを保存し、ファイルとBusycubeアイコンの図を見る。
 * 箱ごとの解法:
 * - B01「紙と下向き矢印」: 保存したkey.busycubeを、対応環境のアプリアイコンへのドロップ、Busycubeで開く、関連付け後のダブルクリック等で渡す。同じoriginのS-440へ実LaunchQueue.filesが届き、先頭の.busycubeファイルのkind/version/roundが最新download時のlocalStorage値と一致すると開く。投入経路は区別せず、本文の編集・ページ内uploadは要求しない。再downloadは新roundに置換し、別window/reloadでも同じoriginの最新試行を照合する。
 * 使用API: Manifest file_handlers、LaunchQueue/FileSystemFileHandle.getFile、File.text、Blob URL/download、crypto.randomUUID、localStorage。
 * 権限・privacy: 利用者がOSから明示的に渡した先頭fileの最大4KiBだけを端末内で読み、合成したkind/version/一時UUIDだけを扱う。本文・ファイル名・投入経路を保存/送信しない。試行UUIDは受領で消し、未受領は次のdownloadまで保持する。
 * 対応環境: インストール済みPWAの.busycube file handlerとLaunchQueue.filesに対応するbrowser/OS。アプリアイコンへのdrop可否はOS/shortcut依存で、API存在だけでは達成にしない。
 */
function S440Stage(props: Props) {
  const problem = props.boxes.B01;
  const solve = useRef(problem.solve);
  solve.current = problem.solve;
  const pending = useRef<LaunchParams | null>(null);
  const finished = useRef(false);
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [status, setStatus] = useState("waiting");
  useEffect(() => {
    let active = true;
    const inspect = async (params: LaunchParams) => {
      if (
        !active ||
        props.signal.aborted ||
        finished.current ||
        !fileTarget(params.targetURL, location.origin)
      )
        return;
      const handle = params.files[0];
      if (!handle) return;
      try {
        const file = await handle.getFile();
        if (!active || props.signal.aborted) return;
        if (file.size > 4096 || !/\.busycube$/i.test(file.name)) {
          setStatus("invalid");
          return;
        }
        const round = fileRound(await file.text());
        if (!active || props.signal.aborted || finished.current) return;
        if (!round || round !== localStorage.getItem(pendingKey)) {
          setStatus("invalid");
          return;
        }
        localStorage.removeItem(pendingKey);
        finished.current = true;
        pending.current = null;
        solve.current();
        setStatus("launched");
      } catch {
        if (active && !props.signal.aborted) setStatus("error");
      }
    };
    const queue = window.launchQueue;
    const consumer = (params: LaunchParams) => {
      if (!active || props.signal.aborted) return;
      pending.current = params;
      void inspect(params);
    };
    queue?.setConsumer(consumer);
    // Retain a launch already being read across StrictMode's effect replay.
    if (pending.current) void inspect(pending.current);
    const release = () => {
      if (!active) return;
      active = false;
      queue?.setConsumer(() => {});
      for (const [url, timer] of urls.current) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      urls.current.clear();
    };
    props.signal.addEventListener("abort", release, { once: true });
    if (props.signal.aborted) release();
    return () => {
      release();
      props.signal.removeEventListener("abort", release);
    };
  }, [props.signal]);
  const download = () => {
    if (props.signal.aborted || finished.current) return;
    let round: string | undefined;
    let url: string | undefined;
    try {
      round = crypto.randomUUID();
      localStorage.setItem(pendingKey, round);
      url = URL.createObjectURL(
        new Blob([filePayload(round)], { type: "application/x-busycube" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "key.busycube";
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
      const objectUrl = url;
      const timer = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        urls.current.delete(objectUrl);
      }, 1000);
      urls.current.set(url, timer);
      setStatus("downloaded");
    } catch {
      if (url) URL.revokeObjectURL(url);
      try {
        if (round && localStorage.getItem(pendingKey) === round)
          localStorage.removeItem(pendingKey);
      } catch {}
      setStatus("error");
    }
  };
  return (
    <div className="puzzle puzzle--centered s440-puzzle">
      <div className="s440-diagram" aria-hidden="true">
        <span className="s440-file">
          <DescriptionOutlined />
          <span>key.busycube</span>
        </span>
        <ArrowForwardOutlined />
        <img src="/icon.svg" alt="" width={96} height={96} />
      </div>
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={download}
      />
      <p role="status">{statusText(props.locale, status)}</p>
      <p className="s440-cleanup">{stageText(props.locale, locale.cleanup)}</p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: FileDownloadOutlined, color: "#a78bfa", label: locale.B01 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "launchQueue" in window ? "available" : "unsupported",
    ),
  Component: S440Stage,
});
