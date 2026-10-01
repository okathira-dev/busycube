import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "時計", en: "Clock" },
  B02: { ja: "折り返す矢印", en: "Bent arrow" },
});
