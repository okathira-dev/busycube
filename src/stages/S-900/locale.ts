import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "左右の矢印", en: "Opposing arrows" },
  preview: { ja: "リール", en: "Reel" },
  add: { ja: "リールを追加", en: "Add reel" },
  order: { ja: "映写機", en: "Projector" },
  assemble: { ja: "再生", en: "Play" },
  reset: { ja: "並びを消す", en: "Clear order" },
});
