import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "点を結ぶ道", en: "Path connecting dots" },
  B02: { ja: "点を結ぶ道", en: "Path connecting dots" },
  B03: { ja: "点を結ぶ道", en: "Path connecting dots" },
  diagram: {
    ja: "高度の三層と現在高度の精度範囲",
    en: "Three altitude layers and the current accuracy interval",
  },
});
