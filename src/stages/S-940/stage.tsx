import "./styles.css";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import { useEffect, useId, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { type DuelState, duel, moves } from "./duel";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { rankings } from "./rankings";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const hands = { rock: "✊", scissors: "✌", paper: "✋" };
/**
 * S-940
 * 目的: オンライン風じゃんけんで三連勝し、ランキングの複垢の手掛かりから二画面での対戦を発見する。
 * 最初の一手: タイトルのランキングと三連勝ルールを見て「対戦する」を押す。
 * 箱ごとの解法:
 * - B01「向かい合う人」: 同stageを別タブでも開き、両画面で対戦相手を探す。一戦ごとに再検索し、一方の画面が三連勝するよう双方の手を選ぶ。今回の相手/matchに一致する実BroadcastChannelの手を受信し、三連勝目の勝利が確定した画面だけ開く。CPUは連勝数0/1では等確率、2では必ず勝つ手を出す。敗北・あいこは連勝リセット。
 * 使用API: BroadcastChannel、crypto.randomUUID/getRandomValues、AbortSignal。
 * 権限・privacy: 同origin/同storage区画で一時ID・架空名・手だけを交換する。CPUとランキングは端末内の演出。外部通信・実アカウント・個人情報の保存はない。
 * 対応環境: BroadcastChannelを共有できる同じbrowser区画の複数タブ/window。
 */
function S940Stage(props: Props) {
  const nameId = useId();
  const helpId = useId();
  const session = useRef<ReturnType<typeof duel> | null>(null);
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [state, setState] = useState<DuelState | null>(null);
  const [failed, setFailed] = useState(false);
  const [nameError, setNameError] = useState(false);
  const text = (key: keyof typeof locale) =>
    stageText(props.locale, locale[key]);
  useEffect(() => {
    try {
      const channel = new BroadcastChannel("busycube-stage-S-940-v2");
      const current = duel(
        {
          send: (v) => channel.postMessage(v),
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
      window.addEventListener("pagehide", hide);
      return () => {
        window.removeEventListener("pagehide", hide);
        current.dispose();
        session.current = null;
      };
    } catch {
      setFailed(true);
    }
  }, [props.signal]);
  const result = (value: number | null) =>
    text(value === 0 ? "draw" : value === 1 ? "win" : "loss");
  return (
    <div className="puzzle s940-stage">
      <section className="s940-client" aria-label="Hand Arena">
        <header className="s940-header">
          <strong>HAND ARENA</strong>
          <span>● MATCHMAKING</span>
        </header>
        <div className="s940-body">
          <p className="s940-account">{state?.name ?? "…"}</p>
          <p className="s940-mode">{text("freePlay")}</p>
          <h2>3 WIN CHALLENGE</h2>
          <p>{text("rule")}</p>
          <div
            role="img"
            className="s940-streak"
            aria-label={`${state?.streak ?? 0} / 3`}
          >
            {[1, 2, 3].map((n) => (
              <span key={n} data-lit={(state?.streak ?? 0) >= n}>
                ★
              </span>
            ))}
          </div>
          {state?.phase === "lobby" ? (
            <>
              <form
                className="s940-profile"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = new FormData(event.currentTarget).get(
                    "username",
                  );
                  setNameError(
                    typeof value !== "string" ||
                      !session.current?.rename(value),
                  );
                }}
              >
                <label htmlFor={nameId}>{text("username")}</label>
                <div>
                  <input
                    id={nameId}
                    name="username"
                    defaultValue={state.name}
                    required
                    maxLength={20}
                    aria-describedby={helpId}
                    onChange={() => setNameError(false)}
                  />
                  <button
                    className="stage-action"
                    type="submit"
                    disabled={failed}
                  >
                    {text("saveName")}
                  </button>
                </div>
                <small id={helpId}>{text("nameHelp")}</small>
                {nameError ? <p role="alert">{text("nameError")}</p> : null}
              </form>
              <button
                className="stage-action"
                type="button"
                disabled={failed}
                onClick={() => session.current?.next()}
              >
                {text("play")}
              </button>
              <h3>{text("rankings")}</h3>
              <p className="s940-group">{text("group")}</p>
              <section
                className="s940-ranking-scroll"
                aria-label={text("rankings")}
              >
                <ol className="s940-ranking">
                  {rankings.map((entry) => (
                    <li key={entry.name}>
                      <span>{entry.name}</span>
                      <strong>{entry.score.toLocaleString("en-US")}</strong>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : (
            <>
              <div className="s940-arena">
                <div>
                  <span className="s940-avatar" aria-hidden="true">
                    G
                  </span>
                  <strong>{state?.name}</strong>
                  <span className="s940-hand">
                    {state?.mine ? hands[state.mine] : "?"}
                  </span>
                </div>
                <b>VS</b>
                <div>
                  <span className="s940-avatar" aria-hidden="true">
                    {state?.opponent.slice(0, 1).toUpperCase() || "?"}
                  </span>
                  <strong>{state?.opponent || "…"}</strong>
                  <span
                    className="s940-hand"
                    role="img"
                    aria-label={text("opponent")}
                  >
                    {state?.theirs ? hands[state.theirs] : "?"}
                  </span>
                </div>
              </div>
              <div className="s940-choices">
                {moves.map((move) => (
                  <button
                    className="stage-action"
                    key={move}
                    type="button"
                    aria-label={text(move)}
                    disabled={
                      failed || state?.phase !== "playing" || !!state.mine
                    }
                    onClick={(event) => {
                      if (event.isTrusted) session.current?.pick(move);
                    }}
                  >
                    {hands[move]}
                  </button>
                ))}
              </div>
              {state?.phase === "result" && state.streak < 3 ? (
                <button
                  className="stage-action"
                  type="button"
                  onClick={() => session.current?.next()}
                >
                  {text("next")}
                </button>
              ) : null}
              <button
                className="stage-action"
                type="button"
                onClick={() => session.current?.restart()}
              >
                {text("restart")}
              </button>
            </>
          )}
          <p className="interaction-status" role="status">
            {failed
              ? statusText(props.locale, "unavailable")
              : state?.streak === 3
                ? text("clear")
                : state?.phase === "waiting"
                  ? text("waiting")
                  : state?.phase === "joining"
                    ? text("joining")
                    : state?.phase === "result"
                      ? result(state.winner)
                      : state?.phase === "playing"
                        ? text(state.mine ? "selected" : "ready")
                        : ""}
          </p>
          {state?.history.length ? (
            <section className="s940-history" aria-label={text("history")}>
              <h3>{text("history")}</h3>
              <ol>
                {state.history.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.opponent}</span>
                    <span>
                      {hands[entry.mine]} / {hands[entry.theirs]}
                    </span>
                    <strong>{result(entry.winner)}</strong>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </section>
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
