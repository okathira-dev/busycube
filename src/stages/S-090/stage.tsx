import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
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
import {
  consumeNotificationClick,
  prepareNotificationAttempt,
} from "./notificationReceipt";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

function readyWorker(signal: AbortSignal) {
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      finish();
      reject(new Error("Service worker not ready"));
    }, 15_000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    navigator.serviceWorker.ready.then(
      (registration) => {
        finish();
        resolve(registration);
      },
      (error) => {
        finish();
        reject(error);
      },
    );
  });
}

/**
 * S-090
 *
 * 目的: ベルの箱で発行した通知をOS/browserの通知面から開き、実Service Worker通知クリックを確認する。
 * 最初の一手: ベルの箱を押して通知を許可し、ページ外の通知を開く。
 * 箱ごとの解法:
 * - B02「ベル」: 箱を押して発行した今回の通知を開く。trusted notificationclickを受けたService Workerが今回nonceのpending記録をclickedへ更新し、そのtransaction完了後の復帰URLから同じ記録を一度だけ消費すると開く。URLだけの入力や通知の表示だけでは開かない。
 * 使用API: Notifications permission/showNotification、Service Worker notificationclick/clients、IndexedDB、crypto.randomUUID、URL/History。
 * 権限・privacy: 箱の明示操作で通知権限を要求する。短い固定本文と一時nonce/言語だけを通知へ渡し、端末情報や通知本文を保存・送信しない。保存する試行記録は最大一件で、達成時に削除する。
 * 対応環境: secure contextでService Worker通知とIndexedDBを提供するbrowser。通知はページ外から戻るため離脱後も残し、次の発行または実クリックで置換/閉鎖する。
 */
function S090Stage(props: Props) {
  const problem = props.boxes[manifest.box.B02];
  const busy = useRef(false);
  const [status, setStatus] = useState<string>(() =>
    typeof Notification === "undefined"
      ? "unavailable"
      : Notification.permission,
  );
  useEffect(() => {
    const url = new URL(location.href);
    const nonce = url.searchParams.get("notification-receipt");
    if (url.searchParams.has("notification")) {
      url.searchParams.delete("notification");
      history.replaceState(history.state, "", url);
    }
    if (!nonce) return;
    void consumeNotificationClick(nonce, props.signal)
      .then((clicked) => {
        if (props.signal.aborted) return;
        if (clicked) problem.solve();
        else setStatus("invalid");
        const current = new URL(location.href);
        if (current.searchParams.get("notification-receipt") === nonce) {
          current.searchParams.delete("notification-receipt");
          history.replaceState(history.state, "", current);
        }
      })
      .catch(() => {
        if (!props.signal.aborted) setStatus("error");
      });
  }, [problem.solve, props.signal]);
  const notify = async () => {
    if (busy.current || props.signal.aborted) return;
    if (typeof Notification === "undefined" || !navigator.serviceWorker) {
      setStatus("unavailable");
      return;
    }
    busy.current = true;
    try {
      const permission = await Notification.requestPermission();
      if (props.signal.aborted) return;
      setStatus(permission);
      if (permission !== "granted") return;
      setStatus("waiting");
      const registration = await readyWorker(props.signal);
      const nonce = crypto.randomUUID();
      await prepareNotificationAttempt(nonce, props.signal);
      if (props.signal.aborted) return;
      await registration.showNotification("Busycube", {
        body: stageText(props.locale, locale.outsideBody),
        icon: "/icon.svg",
        tag: "busycube-stage-S-090",
        data: { stage: "S-090", nonce, locale: props.locale },
      });
      if (!props.signal.aborted) setStatus("granted");
    } catch {
      if (!props.signal.aborted) setStatus("error");
    } finally {
      busy.current = false;
    }
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox
        box={problem}
        locale={props.locale}
        onClick={() => void notify()}
      />
      <p role="status">{statusText(props.locale, status)}</p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B02]: {
      icon: NotificationsOutlined,
      color: "#f472b6",
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
  Component: S090Stage,
});
