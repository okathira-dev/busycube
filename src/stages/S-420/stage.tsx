import LockOutlined from "@mui/icons-material/LockOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

/**
 * S-420
 *
 * 目的: notification actionで4桁の左右codeを入力し、最後に通知bodyを開いてService Workerからattempt列を返す。
 * 最初の一手: 「金庫を通知へ送る」を押し、通知actionを右→左→左→右（RLLR）の順に押した後、actionではなく通知本体を押す。
 * 箱ごとの解法:
 * - B01「金庫の箱」: Service WorkerがL/R action列を通知dataへ引き継ぎ、body clickで`vault-attempt=RLLR`へ戻した時だけ✓を表示し、600 ms後に開く。
 * 使用API: Notifications APIのactions/data、Service Worker `notificationclick` / `showNotification()`、Clients API、URL/History API、timer。
 * 権限・privacy: 通知権限はbutton操作後だけ要求し、通知dataとURLにはL/R列だけを載せる。入力列を成功判定後にURLから除き、外部送信しない。
 * 対応環境: notification actionと通知body clickを区別し、Service Workerからclientをopen/focusできるbrowser/OS。
 */
function S420Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<string>(Notification.permission);
  useEffect(() => {
    const url = new URL(location.href);
    const attempt = url.searchParams.get("vault-attempt");
    if (attempt !== null) {
      setStatus(attempt === "RLLR" ? "✓" : "×");
      if (attempt === "RLLR") window.setTimeout(() => problem.solve(), 600);
      url.searchParams.delete("vault-attempt");
      history.replaceState(history.state, "", url);
    }
  }, [problem.solve]);
  const begin = async () => {
    const permission = await Notification.requestPermission();
    setStatus(permission);
    if (permission !== "granted" || props.signal.aborted) return;
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Busycube · vault", {
      body: stageText(props.locale, locale.vaultBody),
      tag: "busycube-S-420",
      actions: [
        { action: "left", title: "←" },
        { action: "right", title: "→" },
      ],
      data: { stage: "S-420", sequence: "", target: "RLLR" },
    } as NotificationOptions);
  };
  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <button
        type="button"
        className="stage-action"
        onClick={() => void begin()}
      >
        {stageText(props.locale, locale.sendVault)}
      </button>
      <p className="vault-result" role="status">
        {status === "✓" || status === "×"
          ? status
          : statusText(props.locale, status)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: LockOutlined,
      color: "#fbbf24",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Notification" in window && "serviceWorker" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S420Stage,
});
