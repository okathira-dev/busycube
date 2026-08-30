import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  resolveStageBoxColor,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { GiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import {
  type S920Direction,
  type S920MazeNode,
  s920ChildNodes,
  s920GoalNodes,
  s920MazeNodes,
  s920PathToNode,
  s920RootId,
} from "./functions";
import { locale } from "./locale";

type S920FrameWindow = Window & Pick<typeof globalThis, "CSS" | "HTMLElement">;

type S920AnchorStyle = CSSProperties &
  Readonly<{
    "--s920-anchor-name"?: string;
    "--s920-position-anchor"?: string;
  }>;

const s920FrameSource = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body><div id="s920-frame-root"></div></body>
</html>`;

const arrowByDirection: Readonly<Record<S920Direction, string>> = {
  up: "↑",
  right: "→",
  down: "↓",
  left: "←",
};

const localeKeyByDirection: Readonly<
  Record<
    S920Direction,
    "directionUp" | "directionRight" | "directionDown" | "directionLeft"
  >
> = {
  up: "directionUp",
  right: "directionRight",
  down: "directionDown",
  left: "directionLeft",
};

function goalLocaleKey(boxId: (typeof manifest.boxIds)[number]) {
  return boxId;
}

function supportsS920Layout(frameWindow: S920FrameWindow) {
  return (
    "showPopover" in frameWindow.HTMLElement.prototype &&
    frameWindow.CSS.supports("position-area", "right") &&
    frameWindow.CSS.supports("position-try-fallbacks", "flip-inline")
  );
}

function shadowAnchorName(goalId: string, step: number) {
  return `--s920-shadow-${goalId}-${step}`;
}

/**
 * S-920 — Popover迷路
 *
 * 目的: iframe内のtop layerへ開く入れ子の実Popoverを方向buttonで進み、CSS Anchor Positioningの画面端fallbackを通った3つの終点へ到達する。
 * 最初の一手: 準備完了後に「迷路を開く」を押し、最初の浮かぶ部屋から矢印buttonを選ぶ。行き止まりではEscか外側clickで閉じて入り直す。
 * 箱ごとの解法:
 * - B01: 起点から右→右→上→右→右→下→右と進み、inline端でfallback配置されたamber終点Popover内の箱を直接クリックする。終点が`:popover-open`でtrusted clickなら開く。
 * - B02: 起点から下→左→下→下と進み、block端でfallback配置されたcyan終点Popover内の箱を直接クリックする。終点が`:popover-open`でtrusted clickなら開く。
 * - B03: 起点から左→上→左→上→左→下と進み、混合方向のviolet終点Popover内の箱を直接クリックする。終点が`:popover-open`でtrusted clickなら開く。
 * 使用API: Popover APIの`popover="auto"`、`popoverTarget`、`:popover-open`、CSS Anchor Positioningの`anchor-name`、`position-anchor`、`position-area`、`position-try-fallbacks`。
 * 権限・privacy: 権限・端末情報・保存・送信を使わず、JavaScriptでviewport座標を取得せずにCSSだけで実Popoverと経路silhouetteを配置する。
 * 対応環境: Popover APIとCSS Anchor Positioningの`position-area`および`position-try-fallbacks`をiframe内でも提供するbrowser。
 */
function S920Stage(props: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [frameRoot, setFrameRoot] = useState<HTMLElement | null>(null);
  const [layoutState, setLayoutState] = useState<
    "preparing" | "ready" | "unavailable"
  >("preparing");

  const prepareFrame = useCallback(async () => {
    const frame = frameRef.current;
    const frameDocument = frame?.contentDocument;
    const nextFrameWindow = frame?.contentWindow as S920FrameWindow | null;
    if (!frame || !frameDocument || !nextFrameWindow) return;

    setLayoutState("preparing");
    frameDocument.documentElement.lang = props.locale;
    frameDocument.head
      .querySelectorAll("[data-s920-cloned-style]")
      .forEach((element) => {
        element.remove();
      });

    const styleLoads: Promise<void>[] = [];
    for (const source of document.querySelectorAll(
      'style, link[rel="stylesheet"]',
    )) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.dataset.s920ClonedStyle = "true";
      if (clone instanceof HTMLLinkElement) {
        styleLoads.push(
          new Promise((resolve) => {
            clone.addEventListener("load", () => resolve(), { once: true });
            clone.addEventListener("error", () => resolve(), { once: true });
          }),
        );
      }
      frameDocument.head.append(clone);
    }
    await Promise.all(styleLoads);

    if (frameRef.current !== frame || props.signal.aborted) return;
    const root = frameDocument.getElementById("s920-frame-root");
    if (!root) return;
    setFrameRoot(root);
    setLayoutState(
      supportsS920Layout(nextFrameWindow) ? "ready" : "unavailable",
    );
  }, [props.locale, props.signal]);

  useEffect(() => {
    const frameDocument = frameRef.current?.contentDocument;
    if (frameDocument) frameDocument.documentElement.lang = props.locale;
  }, [props.locale]);

  const setNodeRef = (nodeId: string) => (element: HTMLElement | null) => {
    if (element) nodeRefs.current.set(nodeId, element);
    else nodeRefs.current.delete(nodeId);
  };

  const closeAllPopovers = useCallback(() => {
    for (const node of [...s920MazeNodes].reverse()) {
      const element = nodeRefs.current.get(node.id);
      if (element?.matches(":popover-open")) element.hidePopover();
    }
  }, []);

  useEffect(() => {
    props.signal.addEventListener("abort", closeAllPopovers, { once: true });

    return () => {
      props.signal.removeEventListener("abort", closeAllPopovers);
      closeAllPopovers();
    };
  }, [closeAllPopovers, props.signal]);

  useEffect(() => {
    const frameWindow = frameRoot?.ownerDocument.defaultView;
    if (!frameRoot || !frameWindow) return;

    let useAlternateFallbackList = false;
    const clearRememberedFallbacks = () => {
      useAlternateFallbackList = !useAlternateFallbackList;
      frameRoot.dataset.fallbackRevision = useAlternateFallbackList ? "b" : "a";
    };

    clearRememberedFallbacks();
    frameWindow.addEventListener("resize", clearRememberedFallbacks);
    return () => {
      frameWindow.removeEventListener("resize", clearRememberedFallbacks);
      delete frameRoot.dataset.fallbackRevision;
    };
  }, [frameRoot]);

  const solveGoal = (node: S920MazeNode) => (event: ReactMouseEvent) => {
    if (!node.boxId || !event.isTrusted) return;
    if (!nodeRefs.current.get(node.id)?.matches(":popover-open")) return;
    props.boxes[node.boxId].solve();
  };

  const renderNode = (nodeId: string): React.ReactNode => {
    const node = s920MazeNodes.find((candidate) => candidate.id === nodeId);
    if (!node) return null;
    const children = s920ChildNodes(node.id);
    const direction = node.direction;
    const goalProblem = node.boxId ? props.boxes[node.boxId] : undefined;
    const isDeadEnd = !goalProblem && children.length === 0;
    const goalLabel = node.boxId
      ? stageText(props.locale, locale[goalLocaleKey(node.boxId)])
      : undefined;

    return (
      <section
        key={node.id}
        ref={setNodeRef(node.id)}
        id={node.id}
        popover="auto"
        className="s920-popover"
        data-direction={direction ?? "down"}
        aria-label={goalLabel}
      >
        <div className="s920-popover__room">
          {goalProblem ? (
            <StageProblemGiftBox
              box={goalProblem}
              locale={props.locale}
              onClick={solveGoal(node)}
            />
          ) : null}
          {isDeadEnd ? (
            <span className="s920-popover__dead-end">
              {stageText(props.locale, locale.deadEnd)}
            </span>
          ) : null}
          {children.length > 0 ? (
            <div className="s920-popover__doors">
              {children.map((child) => {
                const childDirection = child.direction;
                if (!childDirection) return null;
                return (
                  <button
                    key={child.id}
                    type="button"
                    className="s920-door"
                    data-direction={childDirection}
                    popoverTarget={child.id}
                    aria-label={stageText(
                      props.locale,
                      locale[localeKeyByDirection[childDirection] ?? "down"],
                    )}
                  >
                    <span aria-hidden="true">
                      {arrowByDirection[childDirection]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        {children.map((child) => renderNode(child.id))}
      </section>
    );
  };

  const renderShadowRoute = (goal: (typeof s920GoalNodes)[number]) => {
    const path = s920PathToNode(goal.id);
    const problem = props.boxes[goal.boxId];

    return (
      <div key={goal.id} className="s920-shadow-route">
        {path.map((node, index) => {
          const nextNode = path[index + 1];
          const positionAnchor =
            index === 0
              ? "--s920-start-anchor"
              : shadowAnchorName(goal.id, index - 1);
          const nextAnchor = nextNode
            ? shadowAnchorName(goal.id, index)
            : undefined;
          const roomStyle: S920AnchorStyle = {
            "--s920-position-anchor": positionAnchor,
          };

          return (
            <div
              key={`${goal.id}-${node.id}`}
              className={`s920-shadow-room${nextNode ? "" : " s920-goal-silhouette"}`}
              data-direction={node.direction ?? "down"}
              style={roomStyle}
            >
              <div className="s920-popover__room">
                {nextNode ? (
                  <div className="s920-popover__doors">
                    {s920ChildNodes(node.id).map((child) => {
                      const direction = child.direction;
                      if (!direction) return null;
                      const doorStyle: S920AnchorStyle | undefined =
                        direction === nextNode.direction && nextAnchor
                          ? { "--s920-anchor-name": nextAnchor }
                          : undefined;
                      return (
                        <span
                          key={child.id}
                          className="s920-door s920-shadow-door"
                          data-direction={direction}
                          style={doorStyle}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="problem-gift s920-shadow-gift">
                    <GiftBox
                      state="closed"
                      color={resolveStageBoxColor(problem.definition)}
                      label=""
                      decorative
                    />
                    <span className="problem-gift__clue" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const frameContent = (
    <div className="s920-frame-content">
      <div className="s920-maze" aria-busy={layoutState === "preparing"}>
        <button
          type="button"
          className="stage-action s920-start"
          popoverTarget={s920RootId}
          disabled={layoutState !== "ready"}
        >
          {stageText(props.locale, locale.start)}
        </button>
        {renderNode(s920RootId)}
      </div>
      <div className="s920-shadow-routes" aria-hidden="true">
        {s920GoalNodes.map(renderShadowRoute)}
      </div>
    </div>
  );

  return (
    <div className="puzzle s920-stage">
      <p>{stageText(props.locale, locale.intro)}</p>
      <div className="s920-frame-shell">
        <span className="s920-frame-shell__label">
          {stageText(props.locale, locale.unavailableArea)}
        </span>
        <iframe
          ref={frameRef}
          className="s920-frame"
          title={stageText(props.locale, locale.frameTitle)}
          srcDoc={s920FrameSource}
          loading="lazy"
          onLoad={() => void prepareFrame()}
        />
      </div>
      {frameRoot ? createPortal(frameContent, frameRoot) : null}
      <output className="interaction-status" aria-live="polite">
        {stageText(
          props.locale,
          layoutState === "ready"
            ? locale.ready
            : layoutState === "unavailable"
              ? locale.unavailable
              : locale.preparing,
        )}
      </output>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: RouteOutlined,
      color: "#f59e0b",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: RouteOutlined,
      color: "#22d3ee",
      label: locale.B02,
    },
    [manifest.box.B03]: {
      icon: RouteOutlined,
      color: "#a78bfa",
      label: locale.B03,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "showPopover" in HTMLElement.prototype &&
      CSS.supports("position-area", "right") &&
      CSS.supports("position-try-fallbacks", "flip-inline")
        ? "available"
        : "unsupported",
    ),
  Component: S920Stage,
});
