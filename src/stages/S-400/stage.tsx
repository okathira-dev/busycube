import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";

/**
 * S-400
 *
 * 目的: system wall clockと単調増加clockの差から、端末時計を約1時間戻した後に現在時刻へ戻した一連の変化を検出する。
 * 最初の一手: stageを開いたままOSの日付と時刻設定で自動設定を切り、system時刻をちょうど約1時間前へ変更する。
 * 箱ごとの解法:
 * - B01「巻き戻しの箱」: 入場時の`Date.now()`へ`performance.now()`経過を足した期待時刻に対し、現在wall clockが55〜65分遅れると開く。
 * - B02「現在へ戻す箱」: 同じattemptでB01の時刻差を一度観測した後、wall clockを期待時刻の±5分以内へ戻すと開く。
 * 使用API: `Date.now()`、`performance.now()`、1秒interval。変更操作はOS標準の日付と時刻設定を使う。
 * 権限・privacy: 権限を要求せず、入場時wall/monotonic値と現在offsetだけをmemory内で比較する。絶対時刻や変更履歴を保存・送信しない。
 * 対応環境: OS時刻を利用者が変更でき、wall clock変更中もmonotonic `performance.now()`が連続するbrowser/端末。
 */
function S400Stage(props: Props) {
  const rewind = props.boxes[manifest.box.B01];
  const restore = props.boxes[manifest.box.B02];
  const baseline = useRef({ wall: Date.now(), monotonic: performance.now() });
  const rewound = useRef(false);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const inspect = () => {
      const expected =
        baseline.current.wall +
        (performance.now() - baseline.current.monotonic);
      const minutes = (Date.now() - expected) / 60000;
      setOffset(minutes);
      if (minutes >= -65 && minutes <= -55) {
        rewound.current = true;
        rewind.solve();
      }
      if (rewound.current && Math.abs(minutes) <= 5) restore.solve();
    };
    inspect();
    const timer = window.setInterval(inspect, 1000);
    return () => window.clearInterval(timer);
  }, [restore.solve, rewind.solve]);
  const display = new Date(Date.now() - 60 * 60 * 1000);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={rewind} locale={props.locale} />
        <StageProblemGiftBox box={restore} locale={props.locale} />
      </div>
      <time className="analog-clock" dateTime={display.toISOString()}>
        {display.toLocaleTimeString(props.locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </time>
      <p className="measurement">{offset.toFixed(1)} min</p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: ScheduleOutlined,
      color: "#818cf8",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: KeyboardReturnOutlined,
      color: "#34d399",
      label: locale.B02,
    },
  },
  probe: () => "available",
  Component: S400Stage,
});
