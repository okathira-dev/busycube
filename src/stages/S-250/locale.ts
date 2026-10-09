import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  openNextColor: { ja: "次の色を開く", en: "Open the next color" },
  B01: { ja: "錠前", en: "Padlock" },
  B02: { ja: "砂時計", en: "Hourglass" },
});
