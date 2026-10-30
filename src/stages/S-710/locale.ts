import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  iframeTitle: {
    ja: "外部動画圧縮ツール",
    en: "Embedded video compression tool",
  },
  answer: { ja: "合言葉", en: "Password" },
  placeholder: { ja: "busycube{…}", en: "busycube{…}" },
  B01: { ja: "暗い月", en: "Dark moon" },
  B02: { ja: "割れた画像", en: "Broken image" },
  B03: { ja: "QRコード", en: "QR code" },
  B04: { ja: "循環する矢印", en: "Looping arrows" },
});
