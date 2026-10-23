import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  saveBusycube: { ja: ".busycubeを保存", en: "Save .busycube" },
  B01: { ja: "紙と下向き矢印", en: "File with downward arrow" },
});
