import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "枠から出る矢印", en: "Arrow leaving a square" },
});
