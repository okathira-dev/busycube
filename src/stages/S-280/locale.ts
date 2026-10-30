import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  timeout: {
    ja: "測定値を受信できませんでした",
    en: "No measurement received",
  },
  B02: { ja: "電池", en: "Battery" },
  B03: { ja: "情報", en: "Information" },
  B04: { ja: "温度計", en: "Thermometer" },
  B05: { ja: "ダンベル", en: "Dumbbell" },
});
