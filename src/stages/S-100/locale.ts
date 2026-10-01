import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  senseOrientation: { ja: "姿勢を感じる", en: "Sense orientation" },
  B01: { ja: "回る端末", en: "Rotating device" },
});
