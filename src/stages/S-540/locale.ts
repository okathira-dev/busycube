import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "暗闇の箱", en: "Darkness box" },
  B02: { ja: "眩光の箱", en: "Bright-light box" },
});
