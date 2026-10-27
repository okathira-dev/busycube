import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  plane: { ja: "仮想平面", en: "Virtual plane" },
  failed: {
    ja: "ポインターを固定できませんでした。",
    en: "Pointer lock failed.",
  },
  B01: { ja: "マウス", en: "Mouse" },
  B02: { ja: "マウス", en: "Mouse" },
  B03: { ja: "マウス", en: "Mouse" },
});
