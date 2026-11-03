import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  loadingFont: { ja: "文字を準備しています。", en: "Preparing text." },
  unavailableFont: {
    ja: "文字を表示できません。",
    en: "Could not display the text.",
  },
  answer: { ja: "答え", en: "Answer" },
  box: { ja: "箱", en: "Box" },
});
