import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  traceLabel: {
    ja: "ゆっくりと速く動かす軌跡",
    en: "A trace drawn both slowly and quickly",
  },
  B01: { ja: "点を結ぶ道", en: "Path connecting dots" },
});
