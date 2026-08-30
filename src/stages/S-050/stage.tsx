import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

type ChannelMessage = { type: "hello" | "ack"; sender: string };

function isChannelMessage(value: unknown): value is ChannelMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<ChannelMessage>;
  return (
    (message.type === "hello" || message.type === "ack") &&
    typeof message.sender === "string"
  );
}

/**
 * S-050
 *
 * 目的: 同一originで同じstageを開いた二つの独立したwindow/tabが、互いの存在をchannel越しに確認する。
 * 最初の一手: 「もう一つ開く」を押して同じURLを新しいwindow/tabに開き、両方を閉じずに待つ。
 * 箱ごとの解法:
 * - B01「二つの窓の箱」: 各contextが固有sender ID付き`hello`を送信し、自分以外のsenderによる正しい`hello`または`ack`を`BroadcastChannel`で受信すると開く。
 * 使用API: `window.open()`、Web Cryptoの`crypto.randomUUID()`、Broadcast Channel APIのmessage送受信。
 * 権限・privacy: 権限を要求せず、tab間にはmessage種別と一時的なrandom sender IDだけを流し、閲覧内容や個人情報は保存・外部送信しない。
 * 対応環境: 同一originの複数window/tab間で`BroadcastChannel`を共有でき、popupまたは新規tabを開けるbrowser。
 */
function S050Stage(props: Props) {
  const sender = useMemo(() => crypto.randomUUID(), []);
  const [peer, setPeer] = useState(false);
  const problem = props.boxes[manifest.box.B01];

  useEffect(() => {
    const channel = new BroadcastChannel("busycube-stage-S-050");
    const receive = (event: MessageEvent<unknown>) => {
      if (!isChannelMessage(event.data) || event.data.sender === sender) return;
      setPeer(true);
      problem.solve();
      if (event.data.type === "hello") {
        channel.postMessage({ type: "ack", sender });
      }
    };
    channel.addEventListener("message", receive);
    channel.postMessage({ type: "hello", sender });
    const close = () => channel.close();
    props.signal.addEventListener("abort", close, { once: true });
    return close;
  }, [problem.solve, props.signal, sender]);

  return (
    <div className="puzzle puzzle--centered">
      <div className="window-clue" aria-hidden="true">
        <span className="window-clue__pane">1</span>
        <span className="window-clue__pane">{peer ? "2" : "?"}</span>
      </div>
      <button
        type="button"
        className="stage-action"
        onClick={() => window.open(window.location.href, "_blank", "noopener")}
      >
        {stageText(props.locale, locale.openAnother)}
      </button>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: WindowOutlined,
      color: "#38bdf8",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "BroadcastChannel" in window ? "available" : "unsupported",
    ),
  Component: S050Stage,
});
