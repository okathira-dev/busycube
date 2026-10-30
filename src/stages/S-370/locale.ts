import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "プラグ", en: "Plug" },
  B02: { ja: "斜線入りプラグ", en: "Crossed-out plug" },
  B03: { ja: "満ちた電池", en: "Full battery" },
  B04: { ja: "少ない電池", en: "Low battery" },
});
