import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  box: { ja: "ゲームパッド", en: "Gamepad" },
});
