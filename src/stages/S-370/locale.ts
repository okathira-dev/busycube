import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "接続の箱", en: "Plugged-in box" },
  B02: { ja: "取り外しの箱", en: "Unplugged box" },
  B03: { ja: "75%以上の箱", en: "75% or more box" },
  B04: { ja: "75%未満の箱", en: "Below 75% box" },
});
