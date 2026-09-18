import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  noMatchKey: { ja: "一致しない鍵", en: "No-match key" },
  beginWaiting: { ja: "待機開始", en: "Begin waiting" },
  abort: { ja: "中断", en: "Abort" },
  B01: { ja: "一致なしの箱", en: "No-match box" },
  B02: { ja: "中断の箱", en: "Abort box" },
});
