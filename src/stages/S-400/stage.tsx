import "./styles.css";
import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import { useEffect, useState } from "react";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { ExternalTimeSync, estimateUtc } from "./timeSync";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-400
 *
 * 目的: 外部UTC基準と端末時計を比較し、端末を約一時間戻した後に現在時刻へ戻す。
 * 最初の一手: 針だけの時計を手掛かりにOSの時刻設定を約一時間戻す。
 * 箱ごとの解法:
 * - B03「時計」: OS設定で端末時計を外部UTC基準から55〜65分戻す。直近45秒以内の実取得基準をperformance.nowで補間し、その差が範囲内なら開く。時計の針はこの目標時刻を示す。
 * - B04「折り返す矢印」: 同じ挑戦で一時間戻した実差を観測した後、OS設定で現在時刻へ戻す。再同期した有効基準との差が±5分以内なら開く。B03後は針が現在時刻の目標を示す。
 * 使用API: UTCTime/TimeAPI.ioへのfetch、AbortController、performance.now、Date.now、Page Visibility。
 * 権限・privacy: 権限を要求せず、時刻APIへcredentials/referrerや端末時計を送らない。UTC基準と差はmemory内だけに保持する。
 * 対応環境: 外部HTTPS APIへ到達でき、利用者がOS時計を変更できるブラウザー。通信失敗・古い基準・不連続時計は再同期待ちにする。
 */
function S400Stage(props: Props) {
  const rewind = props.boxes.B03;
  const restore = props.boxes.B04;
  const [target, setTarget] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    let active = true;
    let completed = false;
    let rewound = false;
    let previousPerf = performance.now();
    let previousWall = Date.now();
    const sync = new ExternalTimeSync((reference) => {
      if (active && !completed) setWaiting(!reference);
    });
    const tick = () => {
      if (!active || completed || props.signal.aborted || document.hidden)
        return;
      const now = performance.now();
      const wall = Date.now();
      const elapsed = now - previousPerf;
      const wallElapsed = wall - previousWall;
      previousPerf = now;
      previousWall = wall;
      if (elapsed > 5000 || Math.abs(wallElapsed - elapsed) > 2000) {
        sync.invalidate();
        return;
      }
      const utc = estimateUtc(sync.reference, now);
      if (utc === null) {
        setWaiting(true);
        return;
      }
      setWaiting(false);
      const offset = wall - utc;
      if (offset >= -65 * 60000 && offset <= -55 * 60000) {
        rewound = true;
        rewind.solve();
      }
      setTarget(utc - (rewound ? 0 : 3600000));
      if (rewound && Math.abs(offset) <= 5 * 60000) {
        completed = true;
        restore.solve();
        sync.dispose();
        clearInterval(timer);
      }
    };
    const visibility = () => {
      previousPerf = performance.now();
      previousWall = Date.now();
      if (document.hidden) sync.suspend();
      else if (!completed) {
        sync.invalidate();
        sync.start();
      }
    };
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", visibility);
    const stop = () => {
      active = false;
      clearInterval(timer);
      sync.dispose();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    if (!document.hidden) sync.start();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [rewind.solve, restore.solve, props.signal]);

  const display = target === null ? null : new Date(target);
  const second = display
    ? display.getSeconds() + display.getMilliseconds() / 1000
    : 0;
  const minute = display ? display.getMinutes() + second / 60 : 0;
  const hour = display ? (display.getHours() % 12) + minute / 60 : 0;
  return (
    <div className="puzzle puzzle--centered">
      <time
        role="img"
        className="analog-clock"
        dateTime={display?.toISOString()}
        aria-label={
          display?.toLocaleTimeString(props.locale) ??
          stageText(props.locale, locale.waiting)
        }
        data-ready={!waiting}
      >
        <span
          className="analog-clock__hour"
          style={{ transform: `rotate(${hour * 30}deg)` }}
        />
        <span
          className="analog-clock__minute"
          style={{ transform: `rotate(${minute * 6}deg)` }}
        />
        <span
          className="analog-clock__second"
          style={{ transform: `rotate(${second * 6}deg)` }}
        />
      </time>
      <div className="problem-row">
        <StageProblemGiftBox box={rewind} locale={props.locale} />
        <StageProblemGiftBox box={restore} locale={props.locale} />
      </div>
      {waiting && (
        <p role="status">{stageText(props.locale, locale.waiting)}</p>
      )}
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: ScheduleOutlined,
      tone: "violet",
      label: locale.B03,
    },
    [manifest.box.B04]: {
      icon: KeyboardReturnOutlined,
      tone: "green",
      label: locale.B04,
    },
  },
  Component: S400Stage,
});
