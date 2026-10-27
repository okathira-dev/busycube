import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  outsideBody: {
    ja: "箱が外で待っています。",
    en: "A box is waiting outside.",
  },
  B02: { ja: "ベル", en: "Bell" },
});
