import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  readBattery: { ja: "近くの電池を読む", en: "Read a nearby battery" },
  B01: { ja: "近くの電池の箱", en: "Nearby-battery box" },
});
