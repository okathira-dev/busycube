import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useCallback, useEffect, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

const mazeRows = [
  "#######",
  "#S#...#",
  "#.#.#.#",
  "#...#E#",
  "#######",
] as const;
const start = { row: 1, column: 1 };

/**
 * S-670
 *
 * 目的: page上には座標だけを出し、DevTools Consoleへ描いたread-only mazeを読んで通常buttonから出口へ移動する。
 * 最初の一手: Consoleで`Busycube S-670 maze`の5×7盤面を見つけ、SからEへの道順`↓↓→→↑↑→→↓↓`をpageの方向buttonで押す。
 * 箱ごとの解法:
 * - B01「出口の箱」: 現在座標から壁`#`を避けて上下左右へ1cellずつ移動し、固定mazeの`E` cell（row 3, column 5）へ到達すると開く。
 * 使用API: Console APIの`console.info()`、HTML buttons、React stateによる固定maze座標更新。
 * 権限・privacy: 権限・利用者dataを使用せず、固定mazeと現在座標だけをConsoleへ表示する。操作履歴を保存・送信しない。
 * 対応環境: DevTools Consoleを参照でき、page上のHTML buttonを操作できるdesktop browser。
 */
function S670Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const [position, setPosition] = useState(start);
  const [status, setStatus] = useState("");

  const renderMaze = useCallback((next: typeof start) => {
    const board = mazeRows.map((row) => [...row]);
    const row = board[next.row];
    if (row) row[next.column] = "@";
    console.info(
      `Busycube S-670 maze\n${board.map((line) => line.join("")).join("\n")}`,
    );
  }, []);

  useEffect(() => {
    renderMaze(start);
  }, [renderMaze]);

  const move = (rowOffset: number, columnOffset: number) => {
    const next = {
      row: position.row + rowOffset,
      column: position.column + columnOffset,
    };
    const target = mazeRows[next.row]?.[next.column];
    if (!target || target === "#") {
      renderMaze(position);
      setStatus(stageText(props.locale, locale.wall));
      return;
    }
    setPosition(next);
    renderMaze(next);
    if (target === "E") {
      problem.solve();
      setStatus(stageText(props.locale, locale.exit));
    } else {
      setStatus(stageText(props.locale, locale.printed));
    }
  };

  const reset = () => {
    setPosition(start);
    renderMaze(start);
    setStatus(stageText(props.locale, locale.resetStatus));
  };

  return (
    <div className="puzzle puzzle--centered">
      <StageProblemGiftBox box={problem} locale={props.locale} />
      <p className="measurement">
        {position.row}:{position.column}
      </p>
      <fieldset className="stage-actions">
        <legend>{stageText(props.locale, locale.controls)}</legend>
        <button
          type="button"
          className="stage-action"
          onClick={() => move(-1, 0)}
        >
          ↑
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => move(0, -1)}
        >
          ←
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => move(1, 0)}
        >
          ↓
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={() => move(0, 1)}
        >
          →
        </button>
        <button type="button" className="stage-action" onClick={reset}>
          {stageText(props.locale, locale.reset)}
        </button>
      </fieldset>
      <p className="interaction-status" role="status">
        {status || stageText(props.locale, locale.initial)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VisibilityOffOutlined,
      color: "#eab308",
      label: locale.B01,
    },
  },
  probe: () => "available",
  Component: S670Stage,
});
