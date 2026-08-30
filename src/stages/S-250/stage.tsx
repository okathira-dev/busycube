import HourglassEmptyOutlined from "@mui/icons-material/HourglassEmptyOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
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

type Color = "R" | "G" | "B";
type Message = { type: "alive" | "closing"; color: Color; sender: string };

/**
 * S-250
 *
 * 目的: R/G/Bそれぞれのwindowが生存している同時状態と、三つを指定順に閉じたpage lifecycle messageを親windowで観測する。
 * 最初の一手: 「次の色を開く」を3回押してR・G・B windowを全部残し、白になった後にB→G→Rの順で閉じる。
 * 箱ごとの解法:
 * - B01「白になる箱」: R/G/B windowが500 msごとに送る`alive`を親が受け、直近1,800 ms以内の三色が同時に揃うと開く。
 * - B02「閉じる順番の箱」: 各色windowの`pagehide`による`closing` messageを連続してB・G・Rの順に受けると開く。prefixが崩れた時点で列をresetする。
 * 使用API: `window.open()`、Broadcast Channel API、`pagehide`、interval、sessionStorage、`Date.now()`、Web Crypto UUID。
 * 権限・privacy: 権限を要求せず、channelには色・生存/終了種別・一時sender IDだけを流す。window内容や時刻履歴を保存・外部送信しない。
 * 対応環境: secure contextでBroadcastChannelと複数window/tabを利用できるbrowser。capability判定ではWeb Locks APIも必要とする。
 */
function S250Stage(props: Props) {
  const white = props.boxes[manifest.box.B01];
  const order = props.boxes[manifest.box.B02];
  const params = useMemo(() => new URL(location.href).searchParams, []);
  const color = params.get("color") as Color | null;
  const sender = useMemo(() => crypto.randomUUID(), []);
  const [active, setActive] = useState<Set<Color>>(new Set());
  const closed = useRef<Color[]>([]);
  useEffect(() => {
    const channel = new BroadcastChannel("busycube:S-250:rgb");
    const last = new Map<Color, number>();
    const receive = (event: MessageEvent<Message>) => {
      if (event.data.sender === sender) return;
      if (event.data.type === "alive") last.set(event.data.color, Date.now());
      else {
        closed.current.push(event.data.color);
        if (closed.current.join("") === "BGR") order.solve();
        else if (!"BGR".startsWith(closed.current.join("")))
          closed.current = [];
      }
    };
    channel.addEventListener("message", receive);
    const heartbeat = color
      ? window.setInterval(
          () =>
            channel.postMessage({
              type: "alive",
              color,
              sender,
            } satisfies Message),
          500,
        )
      : undefined;
    if (color)
      channel.postMessage({ type: "alive", color, sender } satisfies Message);
    const inspect = color
      ? undefined
      : window.setInterval(() => {
          const now = Date.now();
          const next = new Set(
            [...last]
              .filter(([, at]) => now - at < 1800)
              .map(([value]) => value),
          );
          setActive(next);
          if (next.size === 3) white.solve();
        }, 400);
    const closing = () => {
      if (color)
        channel.postMessage({
          type: "closing",
          color,
          sender,
        } satisfies Message);
    };
    window.addEventListener("pagehide", closing);
    return () => {
      window.removeEventListener("pagehide", closing);
      if (heartbeat) clearInterval(heartbeat);
      if (inspect) clearInterval(inspect);
      channel.close();
    };
  }, [color, order.solve, sender, white.solve]);
  if (color)
    return (
      <div
        className={`puzzle puzzle--centered rgb-page rgb-page--${color.toLowerCase()}`}
      >
        <p className="measurement">{color}</p>
      </div>
    );
  const openNext = () => {
    const sequence: Color[] = ["R", "G", "B"];
    const index =
      Number(sessionStorage.getItem("busycube:S-250:next") ?? 0) % 3;
    sessionStorage.setItem("busycube:S-250:next", String(index + 1));
    const url = new URL(location.href);
    url.searchParams.set("color", sequence[index] ?? "R");
    window.open(url, "_blank");
  };
  return (
    <div
      className={`puzzle puzzle--centered ${active.size === 3 ? "rgb-monitor--white" : ""}`}
    >
      <div className="problem-row">
        <StageProblemGiftBox box={white} locale={props.locale} />
        <StageProblemGiftBox box={order} locale={props.locale} />
      </div>
      <button type="button" className="stage-action" onClick={openNext}>
        {stageText(props.locale, locale.openNextColor)}
      </button>
      <p className="measurement">{[...active].sort().join(" + ") || "…"}</p>
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
    [manifest.box.B02]: {
      icon: HourglassEmptyOutlined,
      color: "#fb7185",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext && "locks" in navigator && "BroadcastChannel" in window
        ? "available"
        : "unsupported",
    ),
  Component: S250Stage,
});
