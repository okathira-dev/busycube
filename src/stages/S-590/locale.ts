import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "点を結ぶ道", en: "Path connecting dots" },
  B02: { ja: "点を結ぶ道", en: "Path connecting dots" },
  B03: { ja: "点を結ぶ道", en: "Path connecting dots" },
  diagram: {
    ja: "出発点と三つの円、現在の距離",
    en: "Starting point, three rings, and current distance",
  },
});
