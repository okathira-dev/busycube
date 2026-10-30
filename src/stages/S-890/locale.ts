import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  fullscreen: { ja: "全画面", en: "Fullscreen" },
  exit: { ja: "全画面を閉じる", en: "Exit fullscreen" },
  B01: { ja: "外向きの四隅", en: "Outward corners" },
});
