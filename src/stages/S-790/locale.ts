import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B02: { ja: "画面と下向き矢印", en: "Screen with downward arrow" },
  download: { ja: "専用活字ファイル", en: "Dedicated font file" },
  answer: { ja: "合言葉", en: "Passphrase" },
  glyphLabel: { ja: "四つの活字", en: "Four glyphs" },
  missing: { ja: "専用活字が見つかりません", en: "Dedicated font not found" },
  cleanup: {
    ja: "OSへ追加した活字は、端末のフォント設定から削除できます。",
    en: "The installed font can be removed in your device’s font settings.",
  },
});
