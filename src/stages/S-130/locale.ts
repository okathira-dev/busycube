import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  sendKey: { ja: "鍵を外へ", en: "Send key outside" },
  returnKey: { ja: "鍵を戻す", en: "Bring key back" },
  B01: { ja: "紙と上向き矢印", en: "File with upward arrow" },
  B02: { ja: "紙と下向き矢印", en: "File with downward arrow" },
});
