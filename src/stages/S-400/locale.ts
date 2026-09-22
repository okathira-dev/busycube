import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "巻き戻しの箱", en: "Rewind box" },
  B02: { ja: "現在へ戻す箱", en: "Return-to-now box" },
});
