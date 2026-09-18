import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  intro: {
    ja: "大きな平面を縦にも横にも動かし、窓をほとんど全面で重ねてください。",
    en: "Move across the large plane in both directions until the window is almost completely aligned.",
  },
  ratio: { ja: "重なり", en: "Overlap" },
  keyboardHelp: {
    ja: "平面を選択して矢印キーでも動かせます。",
    en: "Focus the plane to move it with the arrow keys too.",
  },
  aligned: { ja: "ほぼ完全に重なりました。", en: "Almost perfectly aligned." },
  B01: { ja: "重なった箱", en: "Aligned box" },
});
