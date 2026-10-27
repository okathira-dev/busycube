import "./styles.css";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { type CommonStatus, statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  type VaultSnapshot,
  validNonce,
  vaultChannel,
  vaultRequest,
  vaultWorker,
} from "./vaultClient";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-420
 * 目的: 通知の左右actionで入力し、通知本体の「試す」で位置ごとの反応を調べ、金庫を開く。
 * 最初の一手: 錠前の箱を押して通知を許可し、外側の通知から入力する。
 * 箱ごとの解法:
 * - B02「錠前」: 箱から挑戦を始め、実notificationclickの左右actionを入力し、本体の「試す」を押す。既存installationId/S-420/問題version 1をSHA-256へかけた五bit由来の左右五入力と、内容/長さが完全一致した提出だけで開く。途中の正解一致では開かず、入力は正解の長さで切り詰めない。短い提出は入力数分だけ、超過位置は誤りとして、試した時だけ各入力の正誤を表示する。再び箱を押すと入力/判定を消して同じ正解の新しい挑戦になる。
 * 使用API: Notifications/Service Worker notificationclick/Clients.navigate・focus・openWindow、MessageChannel、IndexedDB、Web Crypto SHA-256。新しいnonceとnotification step、最新の一つの試行を照合する。固定URL/旧通知/合成eventだけでは開けない。
 * 権限・privacy: 通知許可は箱操作後のみ。保存するのは既存のゲーム用installationId、今回のnonce/所有client/入力/提出後の結果と一回の受領状態だけで、正解列や位置別ハッシュは保存/送信しない。過去の試行履歴は蓄積しない。複数tabでは最後に始めた挑戦だけが有効。離脱のcancelは入力中だけに作用し、既に提出済みの返却結果を消さない。
 * 対応環境: secure contextで通知の左右actionと本体clickを区別し、Service Worker/IndexedDBを使えるbrowser/OS。操作buttonが出ない環境をページ内の代替操作で成功にしない。installationIdは物理端末/PWA installの保証ではなく、保存できない環境のreload後の同一性は保証しない。
 */
function S420Stage(props: Props) {
  const [state, setState] = useState<VaultSnapshot | null>(null);
  const [status, setStatus] = useState<CommonStatus>("idle");
  const worker = useRef<ServiceWorker | null>(null);
  const nonce = useRef<string | null>(null);
  const revision = useRef(-1);
  const receipt = useRef(
    new URL(location.href).searchParams.get("vault-receipt"),
  );
  const currentLocale = useRef(props.locale);
  currentLocale.current = props.locale;
  const active = useRef(false);
  const beginning = useRef(false);
  const solved = useRef(false);
  const runtime = useRef<AbortController | null>(null);
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const installationId = props.services.installationId;

  useEffect(() => {
    if (props.signal.aborted) return;
    const controller = new AbortController();
    runtime.current = controller;
    active.current = !props.signal.aborted;
    const valid = () =>
      active.current && !controller.signal.aborted && !props.signal.aborted;
    const inspect = async (claim = false) => {
      const current = nonce.current;
      if (!valid() || !current || !installationId) return;
      try {
        const target = worker.current ?? (await vaultWorker(controller.signal));
        if (!valid()) return;
        worker.current = target;
        const value = await vaultRequest(
          target,
          claim ? "consume" : "read",
          current,
          installationId,
          currentLocale.current,
          controller.signal,
        );
        if (!valid() || nonce.current !== current) return;
        if (claim) receipt.current = null;
        if (value && value.revision < revision.current) return;
        if (value) revision.current = value.revision;
        else nonce.current = null;
        setState(value);
        setStatus(
          !value || value.phase === "cancelled"
            ? "cancelled"
            : value.phase === "error"
              ? "error"
              : value.phase === "ended"
                ? "read"
                : "active",
        );
        if (claim && value?.won && !solved.current) {
          solved.current = true;
          boxes.current.B02.solve();
          setStatus("success");
        }
      } catch {
        if (valid() && nonce.current === current) setStatus("error");
      }
    };
    const message = (event: MessageEvent) => {
      if (
        event.isTrusted !== true ||
        event.source !== worker.current ||
        event.data?.type !== vaultChannel ||
        event.data.nonce !== nonce.current
      )
        return;
      void inspect();
    };
    const returned = () => {
      if (document.visibilityState === "visible") void inspect();
    };
    navigator.serviceWorker.addEventListener("message", message);
    window.addEventListener("focus", returned);
    document.addEventListener("visibilitychange", returned);
    const url = new URL(location.href);
    url.searchParams.delete("vault-receipt");
    url.searchParams.delete("vault-attempt");
    url.searchParams.delete("notification-sequence");
    if (url.href !== location.href)
      history.replaceState(history.state, "", url);
    if (validNonce(receipt.current)) {
      nonce.current = receipt.current;
      void inspect(true);
    }
    const dispose = () => {
      if (!active.current) return;
      active.current = false;
      controller.abort();
      navigator.serviceWorker.removeEventListener("message", message);
      window.removeEventListener("focus", returned);
      document.removeEventListener("visibilitychange", returned);
      if (worker.current && nonce.current && installationId)
        worker.current.postMessage({
          type: vaultChannel,
          action: "cancel",
          nonce: nonce.current,
          installationId,
        });
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    if (props.signal.aborted) dispose();
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [installationId, props.signal]);

  const begin = async () => {
    const signal = runtime.current?.signal;
    if (
      !active.current ||
      props.signal.aborted ||
      !signal ||
      signal.aborted ||
      beginning.current
    )
      return;
    if (!installationId?.trim()) {
      setStatus("unavailable");
      return;
    }
    beginning.current = true;
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (!active.current || signal.aborted) return;
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "prompt");
        return;
      }
      const target = await vaultWorker(signal);
      if (!active.current || signal.aborted) return;
      const current = crypto.randomUUID();
      nonce.current = current;
      revision.current = -1;
      worker.current = target;
      setState(null);
      setStatus("waiting");
      const value = await vaultRequest(
        target,
        "start",
        current,
        installationId,
        props.locale,
        signal,
      );
      if (!active.current || signal.aborted || nonce.current !== current)
        return;
      if (value && value.revision < revision.current) return;
      if (value) revision.current = value.revision;
      setState(value);
      setStatus(value?.phase === "active" ? "active" : "error");
    } catch {
      if (active.current && !signal.aborted) setStatus("error");
    } finally {
      beginning.current = false;
    }
  };

  return (
    <div className="puzzle puzzle--centered s420-vault">
      <StageProblemGiftBox
        box={props.boxes.B02}
        locale={props.locale}
        onClick={() => void begin()}
      />
      <ol
        className="s420-inputs"
        aria-label={stageText(props.locale, locale.inputs)}
      >
        {Array.from(state?.input ?? "", (direction, index) => (
          <li className="s420-entry" key={state?.input.slice(0, index + 1)}>
            <span>{direction === "L" ? "←" : "→"}</span>
            {state?.verdict ? (
              <span
                className="s420-verdict"
                role="img"
                aria-label={stageText(
                  props.locale,
                  state.verdict[index] ? locale.correct : locale.incorrect,
                )}
              >
                {state.verdict[index] ? "✓" : "×"}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p role="status" className="interaction-status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: LockOutlined,
      color: "#fbbf24",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "indexedDB" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S420Stage,
});
