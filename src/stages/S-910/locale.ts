import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  circle: { ja: "円", en: "Circle" },
  triangle: { ja: "三角", en: "Triangle" },
  square: { ja: "四角", en: "Square" },
  reset: { ja: "リセット", en: "Reset" },
  unsupported: {
    ja: "このブラウザはruntime TextTrackを提供していません。",
    en: "This browser cannot create runtime TextTracks.",
  },
  failed: {
    ja: "映像または字幕を準備できませんでした。",
    en: "Video or caption preparation failed.",
  },
  B02: { ja: "字幕線", en: "Caption lines" },
});
