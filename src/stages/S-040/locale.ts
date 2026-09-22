import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "見ない時間の箱", en: "Hidden-time box" },
  B02: { ja: "長い不在の箱", en: "Long-absence box" },
});
