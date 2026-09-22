import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  openAnother: { ja: "もう一つ開く", en: "Open another" },
  B01: { ja: "二つの窓の箱", en: "Two-window box" },
});
