import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  plane: { ja: "平面", en: "Plane" },
  B01: { ja: "点線の四角", en: "Dotted square" },
});
