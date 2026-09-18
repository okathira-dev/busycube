import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "X回転の箱", en: "X-turn box" },
  B02: { ja: "Y回転の箱", en: "Y-turn box" },
  B03: { ja: "Z回転の箱", en: "Z-turn box" },
});
