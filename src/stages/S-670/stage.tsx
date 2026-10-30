import "./styles.css";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import TerminalOutlined from "@mui/icons-material/TerminalOutlined";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { consoleBoard, generateMaze, move, type Point } from "./maze";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-670
 * 目的: installationIdとstage/versionから再現する分岐迷路をConsoleで読み、画面の方向buttonで出口へ進む。
 * 最初の一手: >_を連想する箱と方向キーから、Consoleに出ている盤面と現在地@を見つける。
 * 箱ごとの解法:
 * - B01「山括弧と下線」: Consoleの21×21文字（通路cellは10×10）の生成迷路を読み、上下左右buttonで壁#を避けて実座標を移動しEへ到達すると開く。初期位置は左上の通路、出口は右下の通路で、道順は環境IDにより変わる。移動/壁衝突/回転矢印resetで同じ盤面の実現在地をConsoleへ反映する。Consoleを開いた検出やコード入力は要求しない。
 * 使用API: Console info、TextEncoder、決定的PRNGによる迷路生成、HTML buttons、任意の衝突演出にElement.animate。
 * 権限・privacy: 共通のローカルゲームIDは生成seedだけに使い、IDそのものをConsoleに出さず、物理端末を識別しない。生成迷路/現在地だけを表示し、操作履歴を保存/外部送信しない。
 * 対応環境: Consoleを参照しながらHTML buttonを操作できるbrowser。生成は全通路の到達可能性と分岐を保ち、同じID/versionならreload/resetしても同じ盤面になる。
 */
function MazePuzzle(props: Props & { installationId: string }) {
  const maze = useMemo(
    () => generateMaze(props.installationId),
    [props.installationId],
  );
  const [position, setPosition] = useState<Point>(maze.start);
  const current = useRef(maze.start);
  const solved = useRef(false);
  const locationRef = useRef<HTMLOutputElement>(null);
  const animation = useRef<Animation | null>(null);
  useEffect(() => {
    console.info(consoleBoard(maze, maze.start));
    const stop = () => {
      animation.current?.cancel();
      animation.current = null;
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      stop();
      props.signal.removeEventListener("abort", stop);
    };
  }, [maze, props.signal]);
  const walk = (dr: number, dc: number) => {
    if (props.signal.aborted) return;
    const next = move(maze, current.current, dr, dc);
    animation.current?.cancel();
    animation.current = null;
    if (next === current.current) {
      animation.current =
        locationRef.current?.animate?.(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-7px)" },
            { transform: "translateX(7px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 180 },
        ) ?? null;
    }
    current.current = next;
    setPosition(next);
    console.info(consoleBoard(maze, next));
    if (
      !solved.current &&
      next.row === maze.exit.row &&
      next.column === maze.exit.column
    ) {
      solved.current = true;
      props.boxes.B01.solve();
    }
  };
  const reset = () => {
    if (props.signal.aborted) return;
    animation.current?.cancel();
    animation.current = null;
    current.current = maze.start;
    setPosition(maze.start);
    console.info(consoleBoard(maze, maze.start));
  };
  return (
    <div className="puzzle puzzle--centered s670-puzzle">
      <StageProblemGiftBox box={props.boxes.B01} locale={props.locale} />
      <output className="s670-location" ref={locationRef}>
        {position.row}:{position.column}
      </output>
      <fieldset
        className="s670-controls"
        aria-label={stageText(props.locale, locale.controls)}
      >
        <legend className="sr-only">
          {stageText(props.locale, locale.controls)}
        </legend>
        <button
          type="button"
          className="stage-action s670-up"
          aria-label={stageText(props.locale, locale.up)}
          onClick={() => walk(-1, 0)}
        >
          <ArrowUpwardOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-action s670-left"
          aria-label={stageText(props.locale, locale.left)}
          onClick={() => walk(0, -1)}
        >
          <ArrowBackOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-action s670-down"
          aria-label={stageText(props.locale, locale.down)}
          onClick={() => walk(1, 0)}
        >
          <ArrowDownwardOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-action s670-right"
          aria-label={stageText(props.locale, locale.right)}
          onClick={() => walk(0, 1)}
        >
          <ArrowForwardOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-action s670-reset"
          aria-label={stageText(props.locale, locale.reset)}
          onClick={reset}
        >
          <RestartAltOutlined aria-hidden="true" />
        </button>
      </fieldset>
    </div>
  );
}
function S670Stage(props: Props) {
  const installationId = props.services.installationId;
  return installationId ? (
    <MazePuzzle
      {...props}
      key={installationId}
      installationId={installationId}
    />
  ) : (
    <p role="status">{statusText(props.locale, "waiting")}</p>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: TerminalOutlined, color: "#eab308", label: locale.B01 },
  },
  probe: () => "available",
  Component: S670Stage,
});
