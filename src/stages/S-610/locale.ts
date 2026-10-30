import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  openDialog: { ja: "dialogを開く", en: "Open dialog" },
  dialog: { ja: "窓", en: "Window" },
  close: { ja: "閉じる", en: "Close" },
  B01: { ja: "窓", en: "Window" },
  B02: { ja: "指先", en: "Pointing hand" },
  B03: { ja: "Escキー", en: "Esc key" },
});
