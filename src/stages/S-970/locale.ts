import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "保存箱", en: "Archive box" },
  B02: { ja: "ごみ箱", en: "Wastebasket" },
  save: { ja: "ページを保存", en: "Save page" },
  cleanup: {
    ja: "古い専用項目の整理を再試行できます",
    en: "Old game entries can be cleaned up on the next save",
  },
});
