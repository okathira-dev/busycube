import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  waitHid: { ja: "HID入力を待つ", en: "Wait for HID input" },
  B01: { ja: "入力レポートの箱", en: "Input-report box" },
});
