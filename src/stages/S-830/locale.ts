import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  estimate: { ja: "待機の目安", en: "Estimated waiting progress" },
  B03: { ja: "砂時計", en: "Hourglass" },
  B02: { ja: "錠前", en: "Padlock" },
});
