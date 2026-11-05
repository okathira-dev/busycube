import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B05: { ja: "左矢印", en: "Left arrow" },
  B03: { ja: "再読み込み", en: "Reload" },
  B06: { ja: "右矢印", en: "Right arrow" },
});
