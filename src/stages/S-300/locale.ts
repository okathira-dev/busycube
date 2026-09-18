import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  receiveUsb: { ja: "線の向こうから受け取る", en: "Receive across the wire" },
  B01: { ja: "USB転送の箱", en: "USB-transfer box" },
});
