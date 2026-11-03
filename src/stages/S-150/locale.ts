import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  menu: { ja: "メニュー", en: "Menu" },
  star: { ja: "星", en: "Star" },
  cross: { ja: "バツ", en: "Cross" },
  B04: { ja: "エンターキー", en: "Enter key" },
  B05: { ja: "セレクトメニュー", en: "Select menu" },
  B06: { ja: "アコーディオン", en: "Accordion" },
});
