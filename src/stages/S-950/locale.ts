import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "一番太い弦", en: "Thickest string" },
  B02: { ja: "下から二番目の弦", en: "Second string from bottom" },
  B03: { ja: "下から三番目の弦", en: "Third string from bottom" },
  B04: { ja: "上から三番目の弦", en: "Third string from top" },
  B05: { ja: "上から二番目の弦", en: "Second string from top" },
  B06: { ja: "一番細い弦", en: "Thinnest string" },
  stop: { ja: "マイクを止める", en: "Stop microphone" },
  microphone: { ja: "マイク", en: "Microphone" },
});
