import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  overlayVisible: { ja: "overlay", en: "overlay" },
  browserWindow: { ja: "window", en: "window" },
  B01: { ja: "オーバーレイの箱", en: "Overlay box" },
});
