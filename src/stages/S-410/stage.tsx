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
 * S-410
 *
 * 目的: page外のnotification actionだけで左右のsequenceを入力し、Service Workerが正解prefixを保ちながらclientへ戻す。
 * 最初の一手: 「通知迷路を始める」を押して通知を許可し、通知上のactionを左→右→右→左（LRRL）の順に押す。
 * 箱ごとの解法:
 * - B01「通知操作の箱」: Service Workerが通知actionをL/Rへ変換し、prefixを外す入力では列をreset、`LRRL`完成時に開く`?stage=S-410&notification-sequence=S-410-ok`を入場URLで確認すると開く。
 * 使用API: Notifications APIのactions/data、Service Worker `notificationclick`、`showNotification()`による更新、Clients API、URL/History API。
 * 権限・privacy: 通知権限はbutton操作後だけ要求し、通知dataにはstage ID・L/R列・固定targetだけを持つ。入力列を永続保存・外部送信しない。
 * 対応環境: notification action buttonとService Worker notification clickを実装し、actionごとの通知再表示を許すbrowser/OS。
 */
function S410Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [status, setStatus] = useState(Notification.permission);
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.get("notification-sequence") === "S-410-ok") {
      problem.solve();
      url.searchParams.delete("notification-sequence");
      history.replaceState(history.state, "", url);
    }
  }, [problem.solve]);
  const begin = async () => {
    const permission = await Notification.requestPermission();
    setStatus(permission);
    if (permission !== "granted" || props.signal.aborted) return;
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Busycube · ◀ ▶", {
      body: stageText(props.locale, locale.notificationBody),
      tag: "busycube-S-410",
      actions: [
        { action: "left", title: "←" },
        { action: "right", title: "→" },
      ],
      data: { stage: "S-410", sequence: "", target: "LRRL" },
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
        {stageText(props.locale, locale.beginNotifications)}
      </button>
      <p role="status">{statusText(props.locale, status)}</p>
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
  Component: S410Stage,
});
