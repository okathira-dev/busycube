import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  callOutside: { ja: "外へ呼ぶ", en: "Call outside" },
  outsideBody: {
    ja: "箱が外で待っています。",
    en: "A box is waiting outside.",
  },
  B01: { ja: "通知の箱", en: "Notification box" },
});
