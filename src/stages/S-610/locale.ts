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
  B01: { ja: "ボタン閉じの箱", en: "Button-close box" },
  B02: { ja: "外側閉じの箱", en: "Light-dismiss box" },
  B03: { ja: "Escape閉じの箱", en: "Escape-close box" },
});
