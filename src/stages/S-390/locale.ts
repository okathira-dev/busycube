import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  noMatchKey: { ja: "一致しない鍵", en: "No-match key" },
  beginWaiting: { ja: "待機開始", en: "Begin waiting" },
  abort: { ja: "中断", en: "Abort" },
  B01: { ja: "砂時計", en: "Hourglass" },
  B02: { ja: "砂時計", en: "Hourglass" },
});
