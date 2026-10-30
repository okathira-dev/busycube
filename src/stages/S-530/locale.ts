import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B04: { ja: "左右矢印", en: "Horizontal arrows" },
  B05: { ja: "上下矢印", en: "Vertical arrows" },
  B06: { ja: "斜めの両矢印", en: "Diagonal double arrow" },
  horizontal: { ja: "端末の左右軸", en: "Device left-right axis" },
  vertical: { ja: "端末の上下軸", en: "Device up-down axis" },
  depth: { ja: "端末画面の前後軸", en: "Device screen depth axis" },
});
