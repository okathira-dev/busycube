import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  intro: {
    ja: "新しい空の使い捨てフォルダーを選ぶと、準備ファイルを二つ作成し、そのフォルダー内を読み取ります。",
    en: "Choosing a new empty disposable folder allows this page to create two preparation files and read that folder.",
  },
  choose: { ja: "空のフォルダーを選ぶ", en: "Choose an empty folder" },
  nonEmpty: {
    ja: "空でないフォルダーには書き込みません。新しい空のフォルダーを選んでください。",
    en: "Nothing is written to a non-empty folder. Choose a new empty folder.",
  },
  ready: { ja: "フォルダーを準備しました。", en: "The folder is ready." },
  cleanup: {
    ja: "終わったら、この使い捨てフォルダーはOS側で手動削除できます。ここから既存ファイルを削除する操作はありません。",
    en: "When finished, you may delete this disposable folder manually in your OS. This page never deletes your existing files.",
  },
  reference: { ja: "見本の書庫", en: "Reference archive" },
  format: {
    ja: "UTF-8 · LF · 末尾改行あり",
    en: "UTF-8 · LF · final newline present",
  },
  B01: { ja: "鉛筆", en: "Pencil" },
  B02: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B03: { ja: "紙と上向き矢印", en: "File with upward arrow" },
});
