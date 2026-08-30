import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import SelectAllOutlined from "@mui/icons-material/SelectAllOutlined";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

type PaymentResponseLike = {
  methodName: string;
  details: unknown;
  complete: (result?: string) => Promise<void>;
  retry?: (errors?: unknown) => Promise<void>;
};

type PaymentRequestLike = { show: () => Promise<PaymentResponseLike> };
type PaymentRequestConstructor = new (
  methodData: unknown[],
  details: unknown,
) => PaymentRequestLike;

type PaymentManagerRegistration = ServiceWorkerRegistration & {
  paymentManager?: { userHint: string };
};

type Wallet = {
  id: "circle" | "diamond";
  worker: URL;
  scope: URL;
  userHint: string;
};

type HandlerEvent = {
  channel?: unknown;
  type?: unknown;
  requestId?: unknown;
  trusted?: unknown;
  wallet?: unknown;
};

function detailsOf(value: unknown): { accepted?: unknown; outcome?: unknown } {
  return value && typeof value === "object"
    ? (value as { accepted?: unknown; outcome?: unknown })
    : {};
}

function workerScriptUrl(source: MessageEventSource | null): string | null {
  if (!source || !("scriptURL" in source)) return null;
  return typeof source.scriptURL === "string" ? source.scriptURL : null;
}

async function waitUntilActivated(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  if (registration.active?.state === "activated") return;
  const worker =
    registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error("Payment handler worker is missing");

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Payment handler activation timed out"));
    }, 10_000);
    const onStateChange = () => {
      if (worker.state === "activated") {
        cleanup();
        resolve();
      } else if (worker.state === "redundant") {
        cleanup();
        reject(new Error("Payment handler worker became redundant"));
      }
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      worker.removeEventListener("statechange", onStateChange);
    };
    worker.addEventListener("statechange", onStateChange);
    onStateChange();
  });
}

async function removeLegacyHandler(paymentRoot: URL): Promise<void> {
  const legacyScript = new URL("payment-handler-sw.js", paymentRoot).href;
  for (const registration of await navigator.serviceWorker.getRegistrations()) {
    if (registration.scope !== paymentRoot.href) continue;
    const worker =
      registration.active ?? registration.waiting ?? registration.installing;
    if (worker?.scriptURL === legacyScript) await registration.unregister();
  }
}

async function registerWallets(wallets: readonly Wallet[]): Promise<void> {
  for (const wallet of wallets) {
    const registration = (await navigator.serviceWorker.register(
      wallet.worker,
      { scope: wallet.scope.href },
    )) as PaymentManagerRegistration;
    await waitUntilActivated(registration);
    if (!registration.paymentManager) {
      throw new Error("PaymentManager is unavailable");
    }
    registration.paymentManager.userHint = wallet.userHint;
  }
}

/**
 * S-780
 *
 * 目的: browser所有Payment Handler chooserで架空BCU walletを選び、approved・declined・retry・特定wallet eventを四つのlifecycle結果へ分ける。
 * 最初の一手: 「財布を開く」を押して○または◇walletを選び、handler windowの✓・×・↻を目的の箱に合わせて操作する。
 * 箱ごとの解法:
 * - B01「承認の箱」: response methodが登録methodと一致し、最初のdetailsが`outcome:"approved", accepted:true`で、`complete("success")`まで成功すると開く。
 * - B02「拒否の箱」: 最初のdetailsが`outcome:"declined", accepted:false`で、`complete("fail")`まで成功すると開く。
 * - B03「再試行の箱」: 最初が`needs-retry`で同じPaymentResponseの`retry()`を実行し、二回目がapproved/accepted trueで`complete("success")`すると開く。
 * - B04「◇財布の箱」: chooserで◇walletを選び、そのexact worker scriptからcurrent request ID・trusted true・wallet diamondを持つ実handler-event messageを受けると開く。
 * 使用API: Payment Request/PaymentResponse complete/retry、Payment Handler Service Worker/PaymentRequestEvent、PaymentManager.userHint、payment method manifest、Service Worker messaging。
 * 権限・privacy: currency BCUの架空1.00だけを使い、実決済・payer情報・credentialを要求しない。wallet IDとrequest IDはattempt判定だけに使い、保存・送信しない。
 * 対応環境: secure contextでPaymentRequest、Payment Handler、Service Worker、method manifest response headerと複数wallet chooserを提供するbrowser。
 */
function S780Stage(props: Props) {
  const boxes = [
    props.boxes.B01,
    props.boxes.B02,
    props.boxes.B03,
    props.boxes.B04,
  ] as const;
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<"idle" | "waiting" | "unavailable">(
    "idle",
  );
  const activeRequestId = useRef<string | undefined>(undefined);
  const paymentRoot = useMemo(
    () => new URL("./payment/", document.baseURI),
    [],
  );
  const method = useMemo(
    () => new URL("method", paymentRoot).href,
    [paymentRoot],
  );
  const wallets = useMemo<readonly Wallet[]>(
    () => [
      {
        id: "circle",
        worker: new URL("wallet-circle/payment-handler-sw.js", paymentRoot),
        scope: new URL("wallet-circle/", paymentRoot),
        userHint: "○",
      },
      {
        id: "diamond",
        worker: new URL("wallet-diamond/payment-handler-sw.js", paymentRoot),
        scope: new URL("wallet-diamond/", paymentRoot),
        userHint: "◇",
      },
    ],
    [paymentRoot],
  );

  useEffect(() => {
    const target = wallets.find((wallet) => wallet.id === "diamond");
    if (!target) return;
    const onMessage = (event: MessageEvent<HandlerEvent>) => {
      const data = event.data;
      if (
        data?.channel !== "busycube-payment" ||
        data.type !== "handler-event" ||
        data.requestId !== activeRequestId.current ||
        data.trusted !== true ||
        data.wallet !== target.id ||
        workerScriptUrl(event.source) !== target.worker.href
      ) {
        return;
      }
      boxes[3]?.solve();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [boxes, wallets]);

  const begin = async () => {
    const PaymentRequest = (
      window as Window & { PaymentRequest?: PaymentRequestConstructor }
    ).PaymentRequest;
    if (!PaymentRequest || !navigator.serviceWorker) {
      setStatus("unavailable");
      return;
    }
    if (running) return;
    setRunning(true);
    setStatus("waiting");
    const requestId = `busycube-${crypto.randomUUID()}`;
    activeRequestId.current = requestId;
    try {
      await removeLegacyHandler(paymentRoot);
      await registerWallets(wallets);
    } catch {
      activeRequestId.current = undefined;
      setRunning(false);
      setStatus("unavailable");
      return;
    }
    try {
      const request = new PaymentRequest(
        [{ supportedMethods: method, data: { busycube: true } }],
        {
          id: requestId,
          total: { label: "BCU", amount: { currency: "BCU", value: "1.00" } },
        },
      );
      const response = await request.show();
      if (props.signal.aborted) return;
      const first = detailsOf(response.details);
      if (response.methodName !== method) {
        await response.complete("unknown");
        return;
      }
      if (first.outcome === "approved" && first.accepted === true) {
        await response.complete("success");
        boxes[0]?.solve();
        return;
      }
      if (first.outcome === "declined" && first.accepted === false) {
        await response.complete("fail");
        boxes[1]?.solve();
        return;
      }
      if (
        first.outcome !== "needs-retry" ||
        typeof response.retry !== "function"
      ) {
        await response.complete("fail");
        return;
      }
      await response.retry({ error: "busycube retry" });
      if (props.signal.aborted) return;
      const second = detailsOf(response.details);
      if (second.outcome === "approved" && second.accepted === true) {
        await response.complete("success");
        boxes[2]?.solve();
        return;
      }
      await response.complete("fail");
    } catch {
      // Browser cancel, handler absence, and timeout are intentionally not a box.
    } finally {
      activeRequestId.current = undefined;
      setRunning(false);
      setStatus("idle");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        {boxes.map((problem) => (
          <StageProblemGiftBox
            key={problem.id}
            box={problem}
            locale={props.locale}
          />
        ))}
      </div>
      <button
        type="button"
        className="stage-action"
        disabled={running}
        onClick={() => void begin()}
      >
        {stageText(props.locale, locale.start)}
      </button>
      <p className="stage-status" role="status" aria-live="polite">
        {status === "waiting"
          ? stageText(props.locale, locale.waiting)
          : status === "unavailable"
            ? stageText(props.locale, locale.unavailable)
            : ""}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: FileUploadOutlined,
      color: "#facc15",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: FileDownloadOutlined,
      color: "#eab308",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: SwapHorizOutlined,
      color: "#ca8a04",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: SelectAllOutlined,
      color: "#a16207",
      label: locale.B04,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      "PaymentRequest" in window &&
      "serviceWorker" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S780Stage,
});
