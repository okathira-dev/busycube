import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  pressed: { ja: "押下", en: "Pressed" },
  axis: { ja: "軸", en: "axis" },
  gestureHint: {
    ja: "2ボタンを押しながらスティックを倒す。",
    en: "Hold two buttons while moving a stick.",
  },
  B01: { ja: "同時入力の箱", en: "Simultaneous-input box" },
});
