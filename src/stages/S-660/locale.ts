import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  unavailable: {
    ja: "状態を観測できません。",
    en: "Could not observe the state.",
  },
  level: { ja: "観測状態", en: "Observed state" },
  lowGauge: { ja: "1段の目盛り", en: "One-segment gauge" },
  mediumGauge: { ja: "2段の目盛り", en: "Two-segment gauge" },
  highGauge: { ja: "3段と4段の目盛り", en: "Three- and four-segment gauges" },
});
