import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  letter: { ja: "文字A", en: "Letter A" },
});
