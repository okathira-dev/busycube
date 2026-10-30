import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  speaker: { ja: "スピーカー", en: "Speaker" },
  stop: { ja: "停止", en: "Stop" },
  input: { ja: "入力", en: "Input" },
  notRecognized: { ja: "認識できません。", en: "Not recognized." },
  speechError: {
    ja: "読み上げを開始できません。",
    en: "Could not start speech.",
  },
  unavailable: {
    ja: "この機能は利用できません。",
    en: "This feature is unavailable.",
  },
  B03: { ja: "キーボード", en: "Keyboard" },
  B01: { ja: "マイク", en: "Microphone" },
});
