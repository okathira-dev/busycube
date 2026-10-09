import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  answerPlaceholder: { ja: "busycube", en: "busycube" },
  B01: { ja: "枝分かれした線", en: "Branching lines" },
});
