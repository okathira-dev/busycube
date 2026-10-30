import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  dropTarget: { ja: "ドロップ先", en: "Drop target" },
  dragImage: { ja: "ドラッグの図", en: "Drag diagram" },
  blockedDragImage: {
    ja: "禁止されたドラッグの図",
    en: "Blocked drag diagram",
  },
  iframeImage: { ja: "iframe画像", en: "iframe image" },
  accepted: { ja: "受け取りました", en: "Received" },
  rejected: { ja: "受け取れません", en: "Not accepted" },
  B04: { ja: "紙と上向き矢印", en: "File with upward arrow" },
  B05: { ja: "紙と下向き矢印", en: "File with downward arrow" },
  B06: { ja: "窓", en: "Window" },
});
