import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  answer: { ja: "ひみつ", en: "secret" },
  sentenceStart: { ja: "合言葉は［", en: "The password is [" },
  sentenceEnd: { ja: "］。", en: "]." },
  B01: { ja: "点線の四角", en: "Dotted square" },
});
