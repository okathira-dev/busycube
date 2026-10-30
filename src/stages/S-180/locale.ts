import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  copy: { ja: "コピー", en: "Copy" },
  copied: { ja: "コピー済み", en: "Copied" },
  B01: { ja: "貼り付け", en: "Paste" },
});
