import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

interface TracePoint {
  x: number;
  y: number;
  time: number;
}

function pointOnCanvas(canvas: HTMLCanvasElement, event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    time: event.timeStamp,
  };
}

/**
 * S-160
 *
 * 目的: 一続きのpointer軌跡から距離・所要時間・区間速度を計算し、遅い部分と速い部分を両方含むgestureを作る。
 * 最初の一手: canvas内を押したまま、途中でゆっくり動かす区間と素早く動かす区間を作り、十分長く線を引いて離す。
 * 箱ごとの解法:
 * - B01「入力軌跡の箱」: pointerup/cancel時に総距離240 canvas px以上、総時間450 ms以上、0.25 px/ms未満の区間と0.75 px/ms超の区間が同じstroke内にあれば開く。
 * 使用API: Pointer Events、pointer capture、event座標と`timeStamp`、Canvas 2D描画、距離計算。
 * 権限・privacy: 権限を要求せず、座標と時刻は現在strokeの描画・計算にだけ使い、軌跡や入力特性を保存・送信しない。
 * 対応環境: Pointer Eventsとpointer capture、Canvas 2Dを実装し、drag入力を行えるbrowserとpointer device。
 */
function S160Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let points: TracePoint[] = [];
    let drawing = false;

    const down = (event: PointerEvent) => {
      drawing = true;
      points = [pointOnCanvas(canvas, event)];
      setDistance(0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drawing) return;
      const point = pointOnCanvas(canvas, event);
      const previous = points.at(-1);
      if (!previous) return;
      context.lineWidth = 5;
      context.lineCap = "round";
      context.strokeStyle = "#7dd3fc";
      context.lineTo(point.x, point.y);
      context.stroke();
      points.push(point);
      const length = points.slice(1).reduce((total, current, index) => {
        const before = points[index];
        return before
          ? total + Math.hypot(current.x - before.x, current.y - before.y)
          : total;
      }, 0);
      setDistance(Math.round(length));
    };
    const up = (event: PointerEvent) => {
      if (!drawing) return;
      drawing = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      const speeds = points.slice(1).flatMap((point, index) => {
        const previous = points[index];
        if (!previous) return [];
        const elapsed = Math.max(1, point.time - previous.time);
        return [
          Math.hypot(point.x - previous.x, point.y - previous.y) / elapsed,
        ];
      });
      const total = points.slice(1).reduce((length, point, index) => {
        const previous = points[index];
        return previous
          ? length + Math.hypot(point.x - previous.x, point.y - previous.y)
          : length;
      }, 0);
      const duration = (points.at(-1)?.time ?? 0) - (points[0]?.time ?? 0);
      const slow = speeds.some((speed) => speed < 0.25);
      const fast = speeds.some((speed) => speed > 0.75);
      if (total >= 240 && duration >= 450 && slow && fast) {
        problem.solve();
      }
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const cleanup = () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [problem.solve, props.signal]);

  return (
    <div className="puzzle puzzle--centered">
      <canvas
        ref={canvasRef}
        className="trace-canvas"
        width="360"
        height="180"
        aria-label={stageText(props.locale, locale.traceLabel)}
      />
      <p className="measurement" aria-live="polite">
        {distance}px
      </p>
      <StageProblemGiftBox box={problem} locale={props.locale} />
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: RouteOutlined,
      color: "#38bdf8",
      label: locale.B01,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "PointerEvent" in window ? "available" : "unsupported",
    ),
  Component: S160Stage,
});
