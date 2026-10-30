import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  start: { ja: "迷路を開く", en: "Open maze" },
  frameTitle: { ja: "ポップオーバー迷路の額縁", en: "Popover maze frame" },
  directionUp: { ja: "上へ進む", en: "Go up" },
  directionRight: { ja: "右へ進む", en: "Go right" },
  directionDown: { ja: "下へ進む", en: "Go down" },
  directionLeft: { ja: "左へ進む", en: "Go left" },
  deadEnd: { ja: "行き止まり", en: "Dead end" },
  preparing: {
    ja: "迷路の額縁を準備しています…",
    en: "Preparing the maze frame…",
  },
  unavailable: {
    ja: "この迷路にはPopoverとAnchor Positioningが必要です。",
    en: "This maze needs Popover and Anchor Positioning.",
  },
  failed: {
    ja: "迷路の表示を準備できませんでした。",
    en: "Maze display preparation failed.",
  },
  B01: { ja: "経路", en: "Route" },
  B02: { ja: "経路", en: "Route" },
  B03: { ja: "経路", en: "Route" },
});
