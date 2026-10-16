import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  waitHid: { ja: "HID入力を待つ", en: "Wait for HID input" },
  B01: { ja: "キーボード", en: "Keyboard" },
});
