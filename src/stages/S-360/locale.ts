import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  speaker: { ja: "スピーカー", en: "Speaker" },
  stop: { ja: "停止", en: "Stop" },
  storage: {
    ja: "保存領域を確認できません。",
    en: "Storage identity is unavailable.",
  },
  B03: { ja: "窓", en: "Window" },
  B04: { ja: "二つの画面", en: "Two screens" },
});
