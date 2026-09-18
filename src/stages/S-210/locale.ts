import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  advanceBadge: { ja: "外側の数字を進める", en: "Advance the outer number" },
  B01: { ja: "外側の数字の箱", en: "Outer-number box" },
});
