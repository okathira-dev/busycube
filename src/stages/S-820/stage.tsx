import "./styles.css";
import MouseOutlined from "@mui/icons-material/MouseOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  resolveStageBoxColor,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { GiftBox, StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

const targets = [
  { boxId: manifest.box.B01, x: 800, y: -600 },
  { boxId: manifest.box.B02, x: -3000, y: 4000 },
  { boxId: manifest.box.B03, x: 6000, y: 8000 },
] as const;
function directionArrow(dx: number, dy: number) {
  return (
    ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"][
      Math.round(Math.atan2(dy, dx) / (Math.PI / 4) + 8) % 8
    ] ?? "•"
  );
}

/**
 * S-820
 *
 * 目的: Pointer Lockの実相対移動で仮想平面を探索し、三箱を照準へ合わせる。
 * 最初の一手: 格子の平面をクリックして固定し、流れる背景と方向・距離を見て箱へ近づく。
 * 箱ごとの解法:
 * - B01「マウス」: ロック中の実movementX/Yで累積位置を(800,-600)の半径64以内へ動かすと自動で開く。
 * - B02「マウス」: 同じ平面を(-3000,4000)の半径64以内へ動かすと自動で開く。
 * - B03「マウス」: 同じ平面を(6000,8000)の半径64以内へ動かすと自動で開く。
 * 使用API: Pointer Lockのrequest/exit/change/error、trusted MouseEventのmovementX/Y、window blur。
 * 権限・privacy: 平面の明示操作でPointer Lockを要求する。位置は訪問中memoryだけで扱い、移動履歴や端末情報は保存・送信しない。
 * 対応環境: 長い相対mouse移動を取得できるdesktop browser。平面の再クリック・標準Esc・focus喪失・離脱で解除する。
 */
function S820Stage(props: Props) {
  const planeRef = useRef<HTMLButtonElement>(null);
  const boxesRef = useRef(props.boxes);
  boxesRef.current = props.boxes;
  const positionRef = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState(positionRef.current);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const solved = new Set<string>();
    const plane = planeRef.current;
    const ownsLock = () =>
      plane !== null && document.pointerLockElement === plane;
    const unlock = () => {
      if (ownsLock()) document.exitPointerLock();
    };
    const change = () => {
      if (active) setLocked(ownsLock());
    };
    const fail = () => {
      if (active) {
        setLocked(false);
        setError(true);
      }
    };
    const move = (event: MouseEvent) => {
      if (
        !active ||
        props.signal.aborted ||
        !ownsLock() ||
        !event.isTrusted ||
        !Number.isFinite(event.movementX) ||
        !Number.isFinite(event.movementY)
      )
        return;
      const next = {
        x: positionRef.current.x + event.movementX,
        y: positionRef.current.y + event.movementY,
      };
      if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) return;
      positionRef.current = next;
      setPosition(next);
      for (const target of targets) {
        if (
          !solved.has(target.boxId) &&
          Math.hypot(target.x - next.x, target.y - next.y) <= 64
        ) {
          solved.add(target.boxId);
          boxesRef.current[target.boxId].solve();
        }
      }
    };
    document.addEventListener("pointerlockchange", change);
    document.addEventListener("pointerlockerror", fail);
    document.addEventListener("mousemove", move);
    window.addEventListener("blur", unlock);
    props.signal.addEventListener("abort", unlock, { once: true });
    return () => {
      active = false;
      document.removeEventListener("pointerlockchange", change);
      document.removeEventListener("pointerlockerror", fail);
      document.removeEventListener("mousemove", move);
      window.removeEventListener("blur", unlock);
      props.signal.removeEventListener("abort", unlock);
      unlock();
    };
  }, [props.signal]);
  const toggle = async () => {
    const plane = planeRef.current;
    if (!plane || props.signal.aborted) return;
    if (document.pointerLockElement === plane) {
      document.exitPointerLock();
      return;
    }
    setError(false);
    try {
      await plane.requestPointerLock();
      if (props.signal.aborted && document.pointerLockElement === plane)
        document.exitPointerLock();
    } catch {
      if (!props.signal.aborted) setError(true);
    }
  };
  return (
    <div className="puzzle s820-stage">
      <div className="problem-row">
        {targets.map(({ boxId }) => (
          <StageProblemGiftBox
            key={boxId}
            box={props.boxes[boxId]}
            locale={props.locale}
          />
        ))}
      </div>
      <div
        className="s820-plane"
        data-locked={locked}
        style={{
          backgroundPosition: `${-position.x % 80}px ${-position.y % 80}px`,
        }}
      >
        <button
          ref={planeRef}
          type="button"
          className="s820-control"
          aria-label={stageText(props.locale, locale.plane)}
          onClick={() => void toggle()}
        />
        {targets.map((target) => (
          <span
            className="s820-world-box"
            key={target.boxId}
            style={{
              left: `calc(50% + ${target.x - position.x}px)`,
              top: `calc(50% + ${target.y - position.y}px)`,
            }}
          >
            <GiftBox
              state={props.boxes[target.boxId].state}
              color={resolveStageBoxColor(props.boxes[target.boxId].definition)}
              label=""
              size="compact"
              decorative
            />
          </span>
        ))}
        <span className="s820-reticle" aria-hidden="true">
          +
        </span>
      </div>
      <ul className="s820-targets">
        {targets.map((target) => (
          <li
            key={target.boxId}
            style={{
              color: resolveStageBoxColor(props.boxes[target.boxId].definition),
            }}
          >
            {directionArrow(target.x - position.x, target.y - position.y)}{" "}
            {Math.round(
              Math.hypot(target.x - position.x, target.y - position.y),
            )}
            px
          </li>
        ))}
      </ul>
      {error ? (
        <p role="status">{stageText(props.locale, locale.failed)}</p>
      ) : null}
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: MouseOutlined,
      color: "#fb7185",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: MouseOutlined,
      color: "#f97316",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: MouseOutlined,
      color: "#facc15",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "requestPointerLock" in Element.prototype ? "available" : "unsupported",
    ),
  Component: S820Stage,
});
