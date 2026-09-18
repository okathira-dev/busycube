import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  purpleTarget: { ja: "紫色から色を採る", en: "Pick from the purple color" },
  pickDrop: { ja: "画面から一滴採る", en: "Pick a drop from the screen" },
  B01: { ja: "色を採る箱", en: "Color-picker box" },
});
