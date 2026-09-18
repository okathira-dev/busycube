import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  answer: { ja: "あいだ", en: "between" },
  sentence: { ja: "ひかりの[あいだ]にしるし。", en: "amber [between] signal" },
  B01: { ja: "選択範囲の箱", en: "Selection box" },
});
