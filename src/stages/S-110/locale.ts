import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  camera: { ja: "カメラ", en: "Camera" },
  B02: { ja: "月", en: "Moon" },
  B03: { ja: "太陽", en: "Sun" },
});
