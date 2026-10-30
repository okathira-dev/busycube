import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "SMSの吹き出し", en: "SMS speech bubble" },
  copy: { ja: "SMS本文をコピー", en: "Copy SMS body" },
  copied: { ja: "コピーしました", en: "Copied" },
  reset: { ja: "新しいコード", en: "New code" },
  inputLabel: { ja: "ワンタイムコード", en: "One-time code" },
});
