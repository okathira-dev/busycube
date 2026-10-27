import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  inputs: { ja: "入力", en: "Input" },
  correct: { ja: "正しい", en: "Correct" },
  incorrect: { ja: "違う", en: "Incorrect" },
  B02: { ja: "錠前", en: "Padlock" },
});
