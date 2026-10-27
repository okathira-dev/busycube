import "./styles.css";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import CloudDownloadOutlined from "@mui/icons-material/CloudDownloadOutlined";
import DownloadDoneOutlined from "@mui/icons-material/DownloadDoneOutlined";
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
  type Download,
  type DownloadState,
  downloadChannel,
  downloadManager,
  downloadRequest,
  downloadScript,
  downloadWorker,
} from "./client";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-960
 * 目的: browserの実Background Fetchを最後まで受信する操作と、外部UIで取り消す操作を二箱に分ける。
 * 最初の一手: 箱から一つのdownloadを開始し、browserのdownload表示と実進捗を見る。
 * 箱ごとの解法:
 * - B01「下向き矢印とチェック」: 箱から始めた今回IDの実backgroundfetchsuccessを受ける。専用Workerが同じrequest URL/ID、実一件のGET response、65536 bytesと固定SHA-256の一致を確認して保存したreceiptを読むと開く。時間経過/registration.resultだけでは開かない。
 * - B02「丸の中のばつ」: 同じ開始操作の後、browser外部のdownload UIで取消する。今回IDのtrusted backgroundfetchabort、failure/abortedを専用Workerが保存したreceiptで開く。ゲームにはabort操作を作らず、通信失敗やbackgroundfetchfailを取消成功にしない。
 * 使用API: BackgroundFetchManager.fetch/get/getIds、実progress、専用Service Workerのnative backgroundfetchsuccess/abort/fail、Cache、Web Crypto、MessageChannel。
 * 権限・privacy: 同originの固定64KiBを約88秒で一つだけ実stream配信し、サイズ/時間を外部入力で増やさない。user-visible downloadへの許可はbrowserへ委ね、PWA installを必須にしない。個人情報や端末mediaは扱わない。
 * 対応環境: secure contextとBackground Fetchを提供する限定browser。離脱後も実取得を継続し、再訪は保存receiptから受領する。外部UI取消の操作差は未観測として残す。
 */
function S960Stage(props: Props) {
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const begin = useRef<() => Promise<void>>(async () => {});
  const seen = useRef(new Set<string>());
  const [status, setStatus] = useState("idle"),
    [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true,
      starting = false,
      sequence = 0;
    let bootstrapped = false;
    let watched: Download | null = null,
      unwatch = () => {};
    const current = () =>
      alive && !controller.signal.aborted && !props.signal.aborted;
    const ready = downloadWorker(controller.signal);
    void ready.catch(() => {});
    const apply = (state: DownloadState, initial: boolean) => {
      if (!current()) return;
      const firstView = initial || !bootstrapped;
      bootstrapped = true;
      for (const [id, receipt] of [
        ["B01", state.successId],
        ["B02", state.abortId],
      ] as const) {
        if (!receipt || seen.current.has(receipt)) continue;
        seen.current.add(receipt);
        if (!firstView || boxes.current[id].state === "ribboned")
          boxes.current[id].solve();
      }
      setStatus(
        state.status === "failed"
          ? "error"
          : state.status === "aborted"
            ? "cancelled"
            : state.status === "success"
              ? "success"
              : state.status === "idle"
                ? "idle"
                : "waiting",
      );
    };
    const watch = (download: Download) => {
      unwatch();
      watched = download;
      const update = () => {
        if (!current() || watched !== download) return;
        const count = download.downloaded;
        setProgress(
          Number.isSafeInteger(count) && count >= 0 && count <= 65536
            ? count
            : null,
        );
        if (download.result) void refresh(false);
      };
      download.addEventListener("progress", update);
      unwatch = () => {
        download.removeEventListener("progress", update);
      };
      const count = download.downloaded;
      if (current())
        setProgress(
          Number.isSafeInteger(count) && count >= 0 && count <= 65536
            ? count
            : null,
        );
    };
    const refresh = async (initial: boolean) => {
      const request = ++sequence;
      try {
        const { registration, worker } = await ready;
        const state = await downloadRequest(worker, "read", controller.signal);
        if (!current() || request !== sequence) return;
        apply(state, initial);
        const manager = downloadManager(registration);
        if (!manager) {
          setStatus("unavailable");
          return;
        }
        const active = state.id ? await manager.get(state.id) : undefined;
        if (!current() || request !== sequence) return;
        if (active) watch(active);
        else {
          unwatch();
          watched = null;
        }
      } catch {
        if (current() && request === sequence) setStatus("unavailable");
      }
    };
    begin.current = async () => {
      if (!current() || starting) return;
      if (watched && !watched.result) return;
      starting = true;
      setStatus("waiting");
      setProgress(null);
      let id: string | null = null;
      try {
        const { registration, worker } = await ready,
          manager = downloadManager(registration);
        if (!current()) return;
        if (!manager) throw new Error("Background Fetch unavailable");
        const prepared = await downloadRequest(
          worker,
          "prepare",
          controller.signal,
        );
        if (!current() || !prepared.id) return;
        id = prepared.id;
        const url = new URL("/background-fetch/parcel.bin", location.origin);
        url.searchParams.set("trial", id);
        const download = await manager.fetch(id, [url.href], {
          title: "Busycube — Download",
          downloadTotal: 65536,
          icons: [
            {
              src: new URL("/icon-192.png", location.origin).href,
              sizes: "192x192",
              type: "image/png",
            },
          ],
        });
        if (!current()) return;
        watch(download);
        const armed = await downloadRequest(
          worker,
          "arm",
          controller.signal,
          id,
        );
        apply(armed, false);
      } catch {
        if (current()) {
          if (id) {
            try {
              const { worker } = await ready;
              await downloadRequest(worker, "failed", controller.signal, id);
            } catch {}
          }
          if (current()) setStatus("unavailable");
        }
      } finally {
        starting = false;
      }
    };
    const message = (event: MessageEvent<unknown>) => {
      if (
        !event.isTrusted ||
        event.origin !== location.origin ||
        !event.source ||
        !("scriptURL" in event.source) ||
        event.source.scriptURL !== new URL(downloadScript, location.origin).href
      )
        return;
      const data = event.data as { channel?: unknown; type?: unknown } | null;
      if (data?.channel === downloadChannel && data.type === "changed")
        void refresh(false);
    };
    const focus = () => {
      if (current() && !document.hidden) void refresh(false);
    };
    const stop = () => {
      alive = false;
      controller.abort();
      unwatch();
      watched = null;
    };
    navigator.serviceWorker?.addEventListener("message", message);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("pagehide", stop, { once: true });
    props.signal.addEventListener("abort", stop, { once: true });
    if (props.signal.aborted) stop();
    else void refresh(true);
    return () => {
      stop();
      navigator.serviceWorker?.removeEventListener("message", message);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("pagehide", stop);
      props.signal.removeEventListener("abort", stop);
    };
  }, [props.signal]);
  return (
    <div className="puzzle puzzle--centered s960-stage">
      <CloudDownloadOutlined className="s960-cloud" aria-hidden="true" />
      <div className="problem-row">
        {manifest.boxIds.map((id) => (
          <StageProblemGiftBox
            key={id}
            box={props.boxes[id]}
            locale={props.locale}
            onClick={() => void begin.current()}
          />
        ))}
      </div>
      {status === "waiting" || progress !== null ? (
        <progress
          max={65536}
          value={progress ?? undefined}
          aria-label={stageText(props.locale, locale.progress)}
        />
      ) : null}
      <p role="status" className="interaction-status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: DownloadDoneOutlined, color: "#38bdf8", label: locale.B01 },
    B02: { icon: CancelOutlined, color: "#0284c7", label: locale.B02 },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "serviceWorker" in navigator &&
      "ServiceWorkerRegistration" in window &&
      "backgroundFetch" in ServiceWorkerRegistration.prototype
        ? "permission-required"
        : "unsupported",
    ),
  Component: S960Stage,
});
