import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  driveNotConfigured: {
    ja: "Google Drive未設定",
    en: "Google Drive is not configured",
  },
  B02: { ja: "重なる二つの枠", en: "Two overlapping frames" },
});
