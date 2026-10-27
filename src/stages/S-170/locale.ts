import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  pause: { ja: "停止", en: "Pause" },
  play: { ja: "再開", en: "Resume" },
  B02: { ja: "時計", en: "Clock" },
});
