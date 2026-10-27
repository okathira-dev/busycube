import "./styles.css";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { type DuelState, duel, type Move } from "./duel";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const moves: Move[] = ["rock", "scissors", "paper"];
const hands = { rock: "✊", scissors: "✌", paper: "✋" };
/**
 * S-940
 * 目的: 二つの画面で実メッセージを交換し、P1がじゃんけんで一勝する。
 * 最初の一手: ローカル対戦のP1/P2表示と相手の待機枠を見る。
 * 箱ごとの解法:
 * - B01「向かい合う人」: 同stageを二画面で開き、P1/P2の両方で手を選ぶ。今回の相手/match/roundに一致するnative BroadcastChannel messageを受け、両者の手が揃ってP1勝利ならP1画面の箱が開く。両方揃うまで相手の手を隠し、あいこ/P2勝利は次の勝負へ進む。
 * 使用API: BroadcastChannel、crypto.randomUUID、AbortSignal。接続は二者だけで確認し、三画面目は相手を待つ。
 * 権限・privacy: 同origin/同storage区画の一時ID/手だけを交換し、外部通信・保存・個人情報・実オンライン対戦は使わない。
 * 対応環境: BroadcastChannelを共有できる同じbrowser区画の複数画面。オンラインは開発中として選択不可にする。
 */
function S940Stage(props: Props) {
  const session = useRef<ReturnType<typeof duel> | null>(null),
    boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [state, setState] = useState<DuelState>({
    phase: "waiting",
    role: null,
    mine: null,
    theirs: null,
    opponentReady: false,
    winner: null,
  });
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try {
      const channel = new BroadcastChannel("busycube-stage-S-940-v1");
      const current = duel(
        {
          send: (value) => channel.postMessage(value),
          listen: (handler) => {
            channel.addEventListener("message", handler);
            return () => channel.removeEventListener("message", handler);
          },
          close: () => channel.close(),
        },
        crypto.randomUUID(),
        location.origin,
        props.signal,
        setState,
        () => boxes.current.B01.solve(),
      );
      session.current = current;
      const hide = () => current.dispose();
      window.addEventListener("pagehide", hide, { once: true });
      return () => {
        window.removeEventListener("pagehide", hide);
        current.dispose();
        if (session.current === current) session.current = null;
      };
    } catch {
      setFailed(true);
    }
  }, [props.signal]);
  return (
    <div className="puzzle puzzle--centered s940-stage">
      <div className="s940-modes">
        <span>{stageText(props.locale, locale.local)}</span>
        <button type="button" disabled>
          {stageText(props.locale, locale.online)}
          <small>{stageText(props.locale, locale.development)}</small>
        </button>
      </div>
      <div className="s940-arena" data-role={state.role ?? "waiting"}>
        <div>
          <strong>{state.role ? `P${state.role}` : "P1"}</strong>
          <span className="s940-hand">
            {state.mine ? hands[state.mine] : "?"}
          </span>
        </div>
        <span aria-hidden="true">×</span>
        <div>
          <strong>{state.role ? `P${state.role === 1 ? 2 : 1}` : "P2"}</strong>
          <span
            role="img"
            className="s940-hand"
            aria-label={stageText(props.locale, locale.opponent)}
          >
            {state.theirs ? hands[state.theirs] : "?"}
          </span>
        </div>
      </div>
      <div className="s940-choices">
        {moves.map((move) => (
          <button
            key={move}
            className="stage-action"
            type="button"
            aria-label={stageText(props.locale, locale[move])}
            disabled={failed || state.phase !== "playing" || !!state.mine}
            onClick={(event) => {
              if (event.isTrusted) session.current?.pick(move);
            }}
          >
            <span aria-hidden="true">{hands[move]}</span>
          </button>
        ))}
      </div>
      <p className="interaction-status" role="status">
        {failed
          ? statusText(props.locale, "unavailable")
          : state.phase === "waiting"
            ? stageText(props.locale, locale.waiting)
            : state.phase === "joining"
              ? stageText(props.locale, locale.joining)
              : state.phase === "result"
                ? state.winner === 0
                  ? stageText(props.locale, locale.draw)
                  : `P${state.winner} ${stageText(props.locale, locale.wins)}`
                : "…"}
      </p>
      <div className="stage-action-row">
        {state.phase === "result" ? (
          <button
            className="stage-action"
            type="button"
            aria-label={stageText(props.locale, locale.next)}
            disabled={state.role !== 1}
            onClick={() => session.current?.next()}
          >
            <ArrowForwardOutlined aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.restart)}
          onClick={() => session.current?.restart()}
        >
          <RestartAltOutlined aria-hidden="true" />
        </button>
      </div>
      <StageProblemGiftBox box={props.boxes.B01} locale={props.locale} />
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: { B01: { icon: GroupsOutlined, color: "#f97316", label: locale.B01 } },
  probe: () =>
    safeCapabilityProbe(() =>
      "BroadcastChannel" in window ? "available" : "unsupported",
    ),
  Component: S940Stage,
});
