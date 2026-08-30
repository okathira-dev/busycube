import NotificationsOutlined from "@mui/icons-material/NotificationsOutlined";
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
 * S-090
 *
 * 目的: page内buttonだけで完結せず、OS/browserの通知面からBusycubeへ戻ってきたnavigationを確認する。
 * 最初の一手: 「外から呼ぶ」を押して通知を許可し、表示されたBusycube通知を標準の通知UIから開く。
 * 箱ごとの解法:
 * - B01「通知の箱」: Service Workerが表示した通知をclickして`?stage=S-090&notification=1`へ戻り、入場時URLの`notification` parameterが厳密に`1`なら開く。判定後はparameterをURLから除く。
 * 使用API: Notifications APIのpermissionと`showNotification()`、Service Workerのnotification click処理、URL API、History API。
 * 権限・privacy: 通知権限だけを明示操作後に要求し、通知には固定title・stage説明・iconだけを載せる。通知内容やpermission結果を外部送信しない。
 * 対応環境: Notification APIとService Worker通知を実装し、OS/browserの通知clickからclientを開けるsecure context。
 */
function S090Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState<NotificationPermission | "unavailable">(
    Notification.permission,
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("notification") === "1") {
      problem.solve();
      url.searchParams.delete("notification");
      window.history.replaceState({}, "", url);
    }
  }, [problem.solve]);

  const sendNotification = async () => {
    // Permission and notification creation stay inside this click handler because
    // browsers require a user gesture and surprise prompts would violate the UX policy.
    try {
      const permission = await Notification.requestPermission();
      if (props.signal.aborted) return;
      setStatus(permission);
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      if (props.signal.aborted) return;
      const tag = "busycube-stage-S-090";
      await registration.showNotification("Busycube", {
        body: stageText(props.locale, locale.outsideBody),
        icon: "/icon.svg",
        tag,
      });
      if (props.signal.aborted) {
        const notifications = await registration.getNotifications({ tag });
        for (const notification of notifications) notification.close();
      }
    } catch {
      if (!props.signal.aborted) setStatus("unavailable");
    }
  };

  return (
    <div className="puzzle puzzle--centered">
      <div className="bell-clue" aria-hidden="true">
        ♢
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => void sendNotification()}
      >
        {stageText(props.locale, locale.callOutside)}
      </button>
      <p role="status">{statusText(props.locale, status)}</p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: NotificationsOutlined,
      color: "#f472b6",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "Notification" in window && "serviceWorker" in navigator
        ? "permission-required"
        : "unsupported",
    ),
  Component: S090Stage,
});
