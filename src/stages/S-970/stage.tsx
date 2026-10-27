import "./styles.css";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import {
  type ContentState,
  contentChannel,
  contentRequest,
  contentScript,
  contentWorker,
} from "./client";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-970
 * 目的: 保存した専用ページをbrowserの一覧から発見し、ページ内の箱操作と実一覧削除を二箱に分ける。
 * 最初の一手: 保存iconからページをcacheし、実Content Indexへ登録する。
 * 箱ごとの解法:
 * - B01「保存箱」: 保存後、browserのオフラインコンテンツ一覧から専用ページを探して開き、その中の箱を押す。実登録/保存済みの今回IDとexact専用URLからのnative clickに由来するWorker receiptを読み、正規solveで開く。保存だけでは開かない。同じURLを直接開く経路を禁止せず、起動元を厳密に証明した扱いにしない。
 * - B02「ごみ箱」: browserの一覧から今回の専用項目を削除する。同じ専用IDのtrusted contentdeleteをWorkerで保存したreceiptにより開く。index.getAllの空配列、cache欠損、ゲーム内RPCや経過時間では開かない。
 * 使用API: ContentIndex.add/getAll/delete、native contentdelete、専用Service Worker/Cache/MessageChannel、専用ページのtrusted click。
 * 権限・privacy: 自前の小さい専用HTML/JS/CSS/iconだけを保存し、同じ専用scopeの旧ゲーム項目以外は整理しない。個人情報・閲覧履歴を取得/保存/送信せず、PWA installを追加の必須条件にしない。
 * 対応環境: secure contextとContent Index一覧/削除eventを提供する限定browser。ゲーム本体に専用ページへの直接リンク・削除button・静的合言葉を置かず、保存/登録/実操作のreceiptと共有進捗を接続する。
 */
function S970Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const save = useRef<() => Promise<void>>(async () => {}),
    seen = useRef(new Set<string>());
  const [status, setStatus] = useState("idle"),
    [busy, setBusy] = useState(false),
    [cleanup, setCleanup] = useState(false);
  useEffect(() => {
    setBusy(false);
    const controller = new AbortController();
    let alive = true,
      saving = false,
      sequence = 0,
      initial = true;
    const current = () =>
      alive && !controller.signal.aborted && !props.signal.aborted;
    const ready = contentWorker(controller.signal);
    void ready.catch(() => {});
    const apply = (state: ContentState) => {
      if (!current()) return;
      for (const [box, receipt] of [
        ["B01", state.openId],
        ["B02", state.deleteId],
      ] as const) {
        const key = `${box}:${receipt}`;
        if (!receipt || seen.current.has(key)) continue;
        seen.current.add(key);
        if (!initial || boxes.current[box].state === "ribboned")
          boxes.current[box].solve();
      }
      initial = false;
      setCleanup(state.cleanupPending);
      setStatus(
        state.status === "saved"
          ? "created"
          : state.status === "deleted"
            ? "released"
            : state.status === "failed"
              ? "unavailable"
              : state.status === "preparing"
                ? "waiting"
                : "idle",
      );
    };
    const refresh = async () => {
      const request = ++sequence;
      try {
        const { worker } = await ready;
        const state = await contentRequest(
          worker,
          "read",
          controller.signal,
          props.locale,
        );
        if (current() && request === sequence) apply(state);
      } catch {
        if (current() && request === sequence) setStatus("unavailable");
      }
    };
    save.current = async () => {
      if (!current() || saving) return;
      saving = true;
      setBusy(true);
      setStatus("waiting");
      try {
        const { worker } = await ready;
        if (!current()) return;
        const state = await contentRequest(
          worker,
          "save",
          controller.signal,
          props.locale,
        );
        apply(state);
      } catch {
        if (current()) setStatus("unavailable");
      } finally {
        saving = false;
        if (current()) setBusy(false);
      }
    };
    const message = (event: MessageEvent<unknown>) => {
      if (
        !event.isTrusted ||
        event.origin !== location.origin ||
        !event.source ||
        !("scriptURL" in event.source) ||
        event.source.scriptURL !== new URL(contentScript, location.origin).href
      )
        return;
      const data = event.data as { channel?: unknown; type?: unknown } | null;
      if (data?.channel === contentChannel && data.type === "changed")
        void refresh();
    };
    const focus = () => {
      if (current() && !document.hidden) void refresh();
    };
    const stop = () => {
      alive = false;
      controller.abort();
    };
    navigator.serviceWorker?.addEventListener("message", message);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("pagehide", stop, { once: true });
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) stop();
    else void refresh();
    return () => {
      stop();
      navigator.serviceWorker?.removeEventListener("message", message);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("pagehide", stop);
      props.signal.removeEventListener("abort", stop);
    };
  }, [props.signal, props.locale]);
  return (
    <div className="puzzle puzzle--centered s970-stage">
      <ArchiveOutlined className="s970-archive" aria-hidden="true" />
      <button
        className="stage-action s970-save"
        type="button"
        disabled={busy}
        onClick={() => void save.current()}
      >
        <SaveOutlined aria-hidden="true" />
        <span>{stageText(props.locale, locale.save)}</span>
      </button>
      <div className="problem-row">
        {manifest.boxIds.map((id) => (
          <StageProblemGiftBox
            key={id}
            box={props.boxes[id]}
            locale={props.locale}
          />
        ))}
      </div>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
      {cleanup ? (
        <small>{stageText(props.locale, locale.cleanup)}</small>
      ) : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: ArchiveOutlined, color: "#38bdf8", label: locale.B01 },
    B02: { icon: DeleteOutlineOutlined, color: "#0369a1", label: locale.B02 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "serviceWorker" in navigator &&
      "ServiceWorkerRegistration" in window &&
      "index" in ServiceWorkerRegistration.prototype
        ? "permission-required"
        : "unsupported",
    ),
  Component: S970Stage,
});
