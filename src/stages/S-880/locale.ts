import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  intro: {
    ja: "3つの荷物はそれぞれ異なる封印形式です。形式を選んで、実際にストリーム展開してください。",
    en: "The three parcels each use a different seal. Choose a format and actually stream-decompress it.",
  },
  chooseFormat: { ja: "封印形式", en: "Seal format" },
  open: { ja: "荷物を開く", en: "Open parcel" },
  waiting: { ja: "ストリームを展開中…", en: "Decompressing stream…" },
  opened: { ja: "荷物の中身を照合しました。", en: "Parcel contents matched." },
  failed: {
    ja: "この形式では開けません。別の封印を選べます。",
    en: "That format could not open it. Choose another seal.",
  },
  unsupported: {
    ja: "このブラウザはDecompressionStreamを提供していません。",
    en: "This browser has no DecompressionStream.",
  },
  B01: {
    ja: "紙と下向き矢印",
    en: "File with downward arrow",
  },
  B02: {
    ja: "紙と下向き矢印",
    en: "File with downward arrow",
  },
  B03: {
    ja: "紙と下向き矢印",
    en: "File with downward arrow",
  },
});
