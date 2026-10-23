import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  connectShapes: { ja: "形をつなぐ", en: "Connect the shapes" },
  B01: { ja: "左右の矢印", en: "Opposing arrows" },
});
