import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B03: { ja: "時計", en: "Clock" },
  B04: { ja: "折り返す矢印", en: "Bent arrow" },
  waiting: { ja: "時刻を確認しています。", en: "Checking the time." },
});
