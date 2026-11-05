import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "Wi-Fi", en: "Wi-Fi" },
  B02: { ja: "携帯電波", en: "Cellular signal" },
  B03: { ja: "ケーブル", en: "Cable" },
  B04: { ja: "Bluetooth", en: "Bluetooth" },
  unknown: { ja: "?", en: "?" },
  unavailable: {
    ja: "回線種別を取得できません。",
    en: "The route type is unavailable.",
  },
});
