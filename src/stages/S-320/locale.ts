import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  segment: { ja: "面", en: "segment(s)" },
  continuous: { ja: "連続", en: "continuous" },
  folded: { ja: "折りたたみ", en: "folded" },
  foldHint: {
    ja: "折りたたみ端末で折れ目を作る。",
    en: "Create a fold on a foldable device.",
  },
  B01: { ja: "折れ目の箱", en: "Fold box" },
});
