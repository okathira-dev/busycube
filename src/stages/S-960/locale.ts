import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "下向き矢印とチェック", en: "Down arrow with check" },
  B02: { ja: "丸の中のばつ", en: "Circled cross" },
  progress: { ja: "ダウンロード進捗", en: "Download progress" },
});
