import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B02: { ja: "経路", en: "Route" },
  answer: { ja: "回答", en: "Answer" },
  submit: { ja: "確定", en: "Confirm" },
  correct: { ja: "✓", en: "✓" },
  wrong: { ja: "×", en: "×" },
});
