import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  menu: { ja: "メニュー", en: "Menu" },
  circle: { ja: "丸", en: "Circle" },
  B04: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B05: { ja: "点線の四角", en: "Dotted square" },
  B06: { ja: "枝分かれした線", en: "Branching lines" },
});
