import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "月", en: "Moon" },
  B02: { ja: "明暗の円", en: "Contrast circle" },
  B03: { ja: "斜線入りの動く円", en: "Crossed-out moving circle" },
  B04: { ja: "雫", en: "Droplet" },
  B05: { ja: "反転した雫", en: "Inverted droplet" },
  B06: { ja: "縦の画面", en: "Portrait screen" },
  B07: { ja: "横の画面", en: "Landscape screen" },
  B08: { ja: "粗い点", en: "Coarse dots" },
  B09: { ja: "細かい点", en: "Fine dots" },
  B10: { ja: "プリンター", en: "Printer" },
});
