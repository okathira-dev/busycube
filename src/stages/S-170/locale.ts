import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  pausePlay: { ja: "止める / 動かす", en: "Pause / play" },
  B01: { ja: "時間の箱", en: "Animation-time box" },
});
