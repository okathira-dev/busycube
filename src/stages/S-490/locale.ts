import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  answerPlaceholder: { ja: "busycube", en: "busycube" },
  B01: { ja: "busycubeの箱", en: "busycube box" },
});
