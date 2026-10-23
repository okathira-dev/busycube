import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  pausePlay: { ja: "止める / 動かす", en: "Pause / play" },
  B01: { ja: "時計", en: "Clock" },
});
