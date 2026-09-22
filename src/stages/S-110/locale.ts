import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  seeOnlyLight: { ja: "光だけを見る", en: "See only light" },
  B01: { ja: "光の箱", en: "Light box" },
});
