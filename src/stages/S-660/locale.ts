import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  unavailable: {
    ja: "状態を観測できません。",
    en: "Could not observe the state.",
  },
  level: { ja: "観測状態", en: "Observed state" },
  box: { ja: "チップ", en: "Chip" },
});
