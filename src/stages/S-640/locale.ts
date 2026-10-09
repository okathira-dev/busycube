import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  mojibake: { ja: "文字化け", en: "Mojibake" },
  decoded: { ja: "復号した文字列", en: "Decoded text" },
  sharedAnswer: { ja: "共通の復号回答", en: "Shared decoded answer" },
  B01: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B02: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B03: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B04: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B05: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B06: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B07: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B08: { ja: "斜線入りの目", en: "Crossed-out eye" },
});
