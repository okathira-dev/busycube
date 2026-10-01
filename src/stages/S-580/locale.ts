import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  notRecognized: { ja: "認識できない", en: "Not recognized" },
  speechComplete: { ja: "発話完了", en: "Speech complete" },
  speechError: { ja: "発話エラー", en: "Speech error" },
  speaking: {
    ja: "一文字ずつ発話中…",
    en: "Speaking one character at a time…",
  },
  listen: { ja: "聞き取る", en: "Listen" },
  shifted: { ja: "ずれた声を聞く", en: "Hear the shifted voice" },
  B01: {
    ja: "音波の出るスピーカー",
    en: "Speaker with sound waves",
  },
  B02: {
    ja: "音波の出るスピーカー",
    en: "Speaker with sound waves",
  },
});
