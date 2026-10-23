import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  openDialog: { ja: "dialogを開く", en: "Open dialog" },
  tryClose: { ja: "閉じ方を試す", en: "Try a close path" },
  instruction: {
    ja: "ボタン、外側、Escapeを別々に試す。",
    en: "Try the button, outside, and Escape separately.",
  },
  close: { ja: "閉じる", en: "Close" },
  B01: { ja: "窓", en: "Window" },
  B02: { ja: "指先", en: "Pointing hand" },
  B03: { ja: "折り返す矢印", en: "Bent arrow" },
});
