import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  shareMark: { ja: "箱の印:", en: "A mark from the box:" },
  share: { ja: "印を渡す", en: "Share the mark" },
  B01: { ja: "点を結ぶ線", en: "Connected dots" },
  B02: { ja: "画面と下向き矢印", en: "Screen with downward arrow" },
});
