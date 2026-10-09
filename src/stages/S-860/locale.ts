import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  intro: {
    ja: "ここには入力欄がありません。見出しと文章そのものを選び、誤りを直接直してください。",
    en: "There are no text fields here. Focus the headings and sentences themselves, then correct them directly.",
  },
  focusHint: {
    ja: "各行をクリックまたはTabで選択して編集します。",
    en: "Click a line or reach it with Tab to edit it.",
  },
  unsupported: {
    ja: "このブラウザでは通常文章への直接編集を提供できません。",
    en: "This browser cannot provide direct editing on ordinary text.",
  },
  B01: { ja: "鉛筆", en: "Pencil" },
  B02: { ja: "鉛筆", en: "Pencil" },
  B03: { ja: "鉛筆", en: "Pencil" },
});
