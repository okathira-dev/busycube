import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  clue: {
    ja: "クリックできない箱へTabで移動し、selectは文字入力で探す。detailsは複数を開閉する。",
    en: "Reach the pointer-inert box with Tab, search the select by typing, and toggle several details.",
  },
  focusButton: { ja: "キーボードでたどる箱", en: "Keyboard-only box" },
  selectLabel: { ja: "メニューを検索", en: "Search the menu" },
  selectPlaceholder: { ja: "項目を入力して探す", en: "Type to search" },
  B01: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B02: { ja: "点線の四角", en: "Dotted square" },
  B03: { ja: "枝分かれした線", en: "Branching lines" },
});
