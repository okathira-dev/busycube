import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  traceLabel: {
    ja: "ゆっくりと速く動かす軌跡",
    en: "A trace drawn both slowly and quickly",
  },
  B01: { ja: "入力軌跡の箱", en: "Pointer-trace box" },
});
