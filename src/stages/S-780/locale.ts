import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  start: { ja: "財布を開く", en: "Open the wallet" },
  waiting: {
    ja: "ブラウザの決済UIを待っています。",
    en: "Waiting for the browser payment UI.",
  },
  B01: { ja: "紙と上向き矢印", en: "File with upward arrow" },
  B02: { ja: "紙と下向き矢印", en: "File with downward arrow" },
  B03: { ja: "左右の矢印", en: "Opposing arrows" },
  B04: { ja: "点線の四角", en: "Dotted square" },
  unavailable: {
    ja: "Payment Handlerを利用できません。",
    en: "Payment Handler is unavailable.",
  },
});
