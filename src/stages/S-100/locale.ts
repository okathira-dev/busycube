import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  senseOrientation: { ja: "姿勢を感じる", en: "Sense orientation" },
  B01: { ja: "端末姿勢の箱", en: "Orientation box" },
});
