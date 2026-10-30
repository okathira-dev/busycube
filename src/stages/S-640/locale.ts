import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  mojibake: { ja: "文字化け", en: "Mojibake" },
  decoded: { ja: "復号した文字列", en: "Decoded text" },
  sharedAnswer: { ja: "共通の復号回答", en: "Shared decoded answer" },
  B01: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B09: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B10: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B11: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B12: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B13: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B14: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B15: { ja: "斜線入りの目", en: "Crossed-out eye" },
});
