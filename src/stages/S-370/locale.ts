import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  level: { ja: "電池残量", en: "Battery level" },
  unknown: { ja: "不明", en: "Unknown" },
  highRange: {
    ja: "残量の上位4分の1",
    en: "Upper quarter of the battery range",
  },
  lowRange: {
    ja: "残量の下位4分の3",
    en: "Lower three quarters of the battery range",
  },
  B01: { ja: "プラグ", en: "Plug" },
  B02: { ja: "斜線入りプラグ", en: "Crossed-out plug" },
  B03: { ja: "満ちた電池", en: "Full battery" },
  B04: { ja: "少ない電池", en: "Low battery" },
});
