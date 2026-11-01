import "./styles.css";
import GpsFixedOutlined from "@mui/icons-material/GpsFixedOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import SportsSoccerOutlined from "@mui/icons-material/SportsSoccerOutlined";
import VideocamOutlined from "@mui/icons-material/VideocamOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import {
  advance,
  aimAt,
  createGame,
  flightTime,
  type Game,
  kick,
  type Level,
} from "./game";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { isPendingShot, pendingKey } from "./pending";
import { createOpponent, isOpponent } from "./room";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
const aimKeys: Record<string, number | undefined> = {
  ArrowLeft: -0.02,
  ArrowRight: 0.02,
};
/**
 * S-980
 * 目的: ゲーム内の組込み配信表示とともにPKを遊び、配信を見て先回りする相手と切断中のシュートの謎へ進む。
 * 最初の一手: レート1000/1500/2000の部屋を選び、ゴール内をタップして横位置を狙い「蹴る」で発射する。高さは固定。1000/1500は巡回し、1500の巡回幅は1000の半分で蹴った後に反応する。
 * 箱ごとの解法:
 * - B01「サッカーボール」: レート2000で対戦相手名に_subを加えた視聴者が入室し、キーパーが照準へ高速追従することを観察する。通信を切って別のコースへ蹴り、球が序盤を繰り返す間に再接続する。接続状態の復帰を観測すると1500相当の反応で飛翔を再開する。到達時にキーパーを抜いた場合だけ開く。再訪は不要で、1000/1500の得点や切断だけでは開かない。全レートで切断球の待機・再開は同じ処理を使う。
 * 使用API: requestAnimationFrame、navigator.onLineとonline/offline、sessionStorage、crypto.getRandomValues、実pointer/keyboard click。
 * 権限・privacy: 権限不要。配信・視聴者・コメント・対戦は端末内の演出で、画面録画/共有や実対人通信はしない。未完了試行の部屋・架空対戦名・狙い/keeper座標だけをsessionStorageで復元する。ステージ固有の通信は行わない。
 * 対応環境: 接続状態をnavigator.onLineとonline/offlineで観測できるbrowser。sessionStorage拒否時も同画面のゲームは継続できるが、再訪時の試行復元はできない。旧S-060-B02の達成を移行しない。
 */
function PenaltyStage(props: Props) {
  const engine = useRef(createGame());
  const [game, setGame] = useState(engine.current);
  const [online, setOnline] = useState(navigator.onLine);
  const [opponent, setOpponent] = useState(() => createOpponent());
  const opponents = useRef<Partial<Record<Level, string>>>({ easy: opponent });
  const [viewer, setViewer] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    name: string;
    action: "joined" | "left";
  } | null>(null);
  const [practice, setPractice] = useState({
    easy: false,
    medium: false,
    hard: false,
  });
  const update = useCallback((next: Game) => {
    engine.current = next;
    setGame(next);
  }, []);
  const text = (key: keyof typeof locale) =>
    stageText(props.locale, locale[key]);
  useEffect(() => {
    if (game.level === "hard") {
      const name = `${opponent}_sub`;
      if (online && viewer !== name) {
        setViewer(name);
        setNotice({ name, action: "joined" });
      }
    } else if (viewer) {
      setNotice({ name: viewer, action: "left" });
      setViewer(null);
    }
  }, [game.level, opponent, online, viewer]);
  useEffect(() => {
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);
  useEffect(() => {
    let frame = 0;
    let previous: number | undefined;
    const step = (time: number) => {
      frame = 0;
      if (props.signal.aborted || document.visibilityState !== "visible")
        return;
      const dt =
        previous === undefined ? 0 : Math.min((time - previous) / 1000, 0.05);
      previous = time;
      const current = engine.current;
      const next = advance(current, dt, navigator.onLine);
      if (current.phase === "lagging" && next.phase !== "lagging") {
        try {
          sessionStorage.removeItem(pendingKey);
        } catch {}
      }
      if (next !== current) update(next);
      if (current.phase === "flying" && next.phase === "goal") {
        if (next.level !== "hard" || !next.shotOnline)
          setPractice((value) => ({ ...value, [next.level]: true }));
        if (next.level === "hard" && !next.shotOnline) props.boxes.B01.solve();
      }
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = undefined;
    };
    const visibility = () => {
      stop();
      if (!props.signal.aborted && document.visibilityState === "visible")
        frame = requestAnimationFrame(step);
    };
    props.signal.addEventListener("abort", stop, { once: true });
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      stop();
      props.signal.removeEventListener("abort", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [props.signal, props.boxes.B01.solve, update]);
  useEffect(() => {
    if (props.signal.aborted || engine.current.phase !== "ready") return;
    try {
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null");
      if (isPendingShot(pending)) {
        opponents.current[pending.level] = pending.opponent;
        setOpponent(pending.opponent);
        update({
          ...kick(createGame(pending.level), false),
          aim: pending.aim,
          keeper: pending.keeper,
        });
      }
    } catch {}
  }, [props.signal, update]);
  const reset = (next: Level = engine.current.level) => {
    update(createGame(next));
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {}
  };
  const enterRoom = (next: Level) => {
    if (next !== engine.current.level) {
      const name = createOpponent(
        Object.values(opponents.current).filter(isOpponent),
      );
      opponents.current[next] = name;
      setOpponent(name);
    }
    reset(next);
  };
  const shoot = (trusted: boolean) => {
    const current = engine.current;
    if (!trusted || props.signal.aborted || current.phase !== "ready") return;
    update(kick(current, navigator.onLine));
    if (navigator.onLine) return;
    try {
      sessionStorage.setItem(
        pendingKey,
        JSON.stringify({
          level: current.level,
          opponent,
          aim: current.aim,
          keeper: current.keeper,
        }),
      );
    } catch {}
  };
  const flying = game.phase === "flying";
  const lagging = game.phase === "lagging";
  const ready = game.phase === "ready";
  const progress = Math.min(game.flight / flightTime, 1);
  const ballX = 50 + (10 + game.aim.x * 80 - 50) * progress;
  const ballY =
    78 +
    (18 + game.aim.y * 27 - 78) * progress -
    8 * Math.sin(Math.PI * progress);
  return (
    <div className="puzzle pk-stage">
      <section className="pk-stream" aria-label={text("studio")}>
        <div className="pk-stream-game">
          <fieldset className="pk-levels" aria-label={text("rooms")}>
            {(["easy", "medium", "hard"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className="stage-action"
                aria-pressed={game.level === item}
                disabled={flying || lagging}
                onClick={() => enterRoom(item)}
              >
                {text(item)}
                {practice[item] ? " ✓" : ""}
              </button>
            ))}
          </fieldset>
          <p className="pk-help">{text("aimHelp")}</p>
          <div
            className="pk-pitch"
            data-result={game.phase}
            data-level={game.level}
            data-shooting={flying}
          >
            <div className="pk-sdk">
              <VideocamOutlined className="pk-sdk-icon" aria-hidden="true" />
              <strong>{text("app")}</strong>
              <span
                className="pk-stream-status"
                data-connected={online}
                role="status"
              >
                <span aria-hidden="true" />
                {text(online ? "live" : "reconnecting")}
              </span>
              <span className="pk-viewers">
                <VisibilityOutlined aria-hidden="true" />
                <span className="sr-only">{text("viewers")}</span>
                <span className="pk-viewer-count">
                  {online ? (viewer ? 2 : 1) : "—"}
                </span>
              </span>
            </div>
            <div className="pk-score" role="status">
              {text(game.phase)}
            </div>
            <div className="pk-match">
              <span className="sr-only">{text("match")}</span>
              <span>YOU</span>
              <span>vs</span>
              <strong>{opponent}</strong>
            </div>
            <div className="pk-goal">
              <div
                className="pk-keeper"
                style={{
                  left: `${game.keeper.x * 100}%`,
                  top: `${game.keeper.y * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${flying ? Math.sign(game.aim.x - game.keeper.x) * 25 : 0}deg)`,
                }}
                role="img"
                aria-label={text("keeper")}
              >
                <PersonOutlined aria-hidden="true" />
              </div>
              <div className="pk-targets">
                <button
                  type="button"
                  className="pk-target"
                  aria-label={text("aim")}
                  disabled={!ready}
                  onClick={(event) => {
                    if (event.detail === 0) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    if (bounds.width)
                      update(
                        aimAt(
                          engine.current,
                          (event.clientX - bounds.left) / bounds.width,
                        ),
                      );
                  }}
                  onKeyDown={(event) => {
                    const delta = aimKeys[event.key];
                    if (delta === undefined) return;
                    event.preventDefault();
                    update(aimAt(engine.current, engine.current.aim.x + delta));
                  }}
                />
              </div>
              <div
                className="pk-aim"
                style={{
                  left: `${game.aim.x * 100}%`,
                  top: `${game.aim.y * 100}%`,
                }}
                aria-hidden="true"
              >
                <GpsFixedOutlined />
              </div>
            </div>
            <div className="pk-penalty-arc" aria-hidden="true" />
            <div
              className="pk-shooter"
              data-kicking={!ready}
              aria-hidden="true"
            >
              <PersonOutlined />
            </div>
            <div
              className="pk-ball"
              data-phase={game.phase}
              style={{
                left: `${ballX}%`,
                top: `${ballY}%`,
                scale: 1 - progress * 0.45,
              }}
              aria-hidden="true"
            >
              <SportsSoccerOutlined />
            </div>
            <div className="pk-controls">
              <button
                type="button"
                className="pk-kick stage-action"
                disabled={flying || lagging}
                onClick={(event) => (ready ? shoot(event.isTrusted) : reset())}
              >
                {lagging ? (
                  text("waiting")
                ) : ready || flying ? (
                  <>
                    <SportsSoccerOutlined aria-hidden="true" />
                    {text("kick")}
                  </>
                ) : (
                  text("retry")
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="pk-comments" role="log" aria-label={text("comments")}>
          <p>
            <span className="pk-comment-name">cube_fan</span>
            {text("cheer")}
          </p>
          {notice && (
            <p className="pk-joined">
              <VisibilityOutlined aria-hidden="true" />
              {text(notice.action).replace("{name}", notice.name)}
            </p>
          )}
        </div>
      </section>
      <StageProblemGiftBox box={props.boxes.B01} locale={props.locale} />
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: SportsSoccerOutlined, tone: "green", label: locale.B01 },
  },
  Component: PenaltyStage,
});
