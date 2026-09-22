import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "X軸の箱", en: "X-axis box" },
  B02: { ja: "Y軸の箱", en: "Y-axis box" },
  B03: { ja: "Z軸の箱", en: "Z-axis box" },
});
