import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  opened: { ja: "開きました", en: "Opened" },
  B01: { ja: "USB", en: "USB" },
});
