import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  download: { ja: "ダウンロード", en: "Download" },
  file: { ja: "ファイル", en: "File" },
  B03: { ja: "紙と上向き矢印", en: "File with upward arrow" },
});
