import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B02: { ja: "小さな窓が重なる画面", en: "Screen with inset window" },
  floatingTitle: { ja: "浮かぶ箱", en: "Floating box" },
  moved: { ja: "別窓へ移動", en: "Moved to floating window" },
});
