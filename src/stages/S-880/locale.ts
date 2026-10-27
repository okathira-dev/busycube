import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B04: { ja: "紙と下向き矢印", en: "File with downward arrow" },
  confirm: { ja: "確定", en: "Confirm" },
  newQuestion: { ja: "問題を更新しました", en: "Question regenerated" },
  preparing: { ja: "生成中…", en: "Generating…" },
  unsupported: {
    ja: "このブラウザは必要な三形式の圧縮・展開に対応していません。",
    en: "This browser does not support all three compression and decompression formats.",
  },
  failed: {
    ja: "問題を生成できませんでした。",
    en: "Question generation failed.",
  },
});
