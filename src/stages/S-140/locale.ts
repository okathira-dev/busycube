import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  connectDevices: { ja: "端末をつなぐ", en: "Connect devices" },
  driveNotConfigured: {
    ja: "Google Drive未設定",
    en: "Google Drive is not configured",
  },
  B01: { ja: "雲と上向き矢印", en: "Cloud with upward arrow" },
  B02: { ja: "画面と携帯端末", en: "Screen and phone" },
});
