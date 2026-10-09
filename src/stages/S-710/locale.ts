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
  B01: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B02: { ja: "紙と下向き矢印", en: "File with downward arrow" },
  B03: { ja: "画面と携帯端末", en: "Screen and phone" },
  B04: { ja: "紙と上向き矢印", en: "File with upward arrow" },
});
