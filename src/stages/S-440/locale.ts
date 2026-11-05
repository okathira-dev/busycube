import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  cleanup: {
    ja: "試したkey.busycubeは、あとで削除できます。",
    en: "You can delete key.busycube after trying it.",
  },
  B01: { ja: "紙と下向き矢印", en: "File with downward arrow" },
});
