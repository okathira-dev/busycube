import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  shareMark: { ja: "箱の印:", en: "A mark from the box:" },
  share: { ja: "印を渡す", en: "Share the mark" },
  B01: { ja: "共有の箱", en: "Share box" },
  B02: { ja: "共有先の箱", en: "Share-target box" },
});
