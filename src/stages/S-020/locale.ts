import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "縦横の枠", en: "Aspect ratio" },
  gauge: { ja: "画面幅", en: "Viewport width" },
});
