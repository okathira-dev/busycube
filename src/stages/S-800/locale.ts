import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "リンク", en: "Link" },
  B02: { ja: "虫眼鏡", en: "Search" },
  searchWord: { ja: "複写機", en: "pyranine" },
  urlSentence: {
    ja: "半透明であるため重ね塗りされた文字を読みやすく、また蛍光色で目立つ。",
    en: "Different compounds, such as rhodamines (Rhodamine 6GD, Rhodamine B) are used for other colours.",
  },
  searchSentence: {
    ja: "このうち特に黄色などの淡い色は、複写機のコピーに写りにくい性質があるが、これは複写機の読み取り機能や濃度設定にも左右される。",
    en: "A typical highlighter is fluorescent yellow, with the colour coming from pyranine.",
  },
  passage1: {
    ja: "蛍光ペン（けいこうペン、英: highlighter）は、フェルトペンのうち、半透明の蛍光性インク（水性蛍光顔料インクなど）を用いたものである。",
    en: "A highlighter, also called a fluorescent pen, is a type of writing device used to bring attention to sections of text by marking them with a vivid, translucent colour.",
  },
  passage2: {
    ja: "他の一般筆記用具で記した文字ないし印刷文字の上から、重要な語句などに重ねてラインを引く用途に用いるラインマーカーの一種である。",
    en: "Highlighters are available in multiple forms, including some that have a retractable felt tip or an eraser on the end opposite the felt.",
  },
  passage3: {
    ja: "蛍光ペンの色には主に、黄色、黄緑色、オレンジ色、ピンク色、水色（空色）、紫色などがある。",
    en: "Many highlighters come in bright, often fluorescent and vibrant colours.",
  },
  source: {
    ja: "出典: ウィキペディア「蛍光ペン」（抜粋・配置変更）",
    en: "Source: Wikipedia, “Highlighter” (excerpted and rearranged)",
  },
  license: {
    ja: "CC BY-SA 4.0",
    en: "CC BY-SA 4.0",
  },
});
