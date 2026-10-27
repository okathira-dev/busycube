import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  box: { ja: "箱", en: "Box" },
  shuffle: { ja: "左右の矢印", en: "Opposing arrows" },
  failed: {
    ja: "画面遷移を開始できません。",
    en: "Could not start the transition.",
  },
  B02: { ja: "左右の矢印", en: "Opposing arrows" },
});
