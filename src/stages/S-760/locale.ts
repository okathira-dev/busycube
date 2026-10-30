import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "連絡先カード", en: "Contact card" },
  B02: { ja: "斜線入りの連絡先カード", en: "Slashed contact card" },
  fullSuccess: {
    ja: "五項目が一致しました。",
    en: "All five properties matched.",
  },
  emptySuccess: {
    ja: "一件を選び、五項目を渡しませんでした。",
    en: "One contact was selected without sharing the five fields.",
  },
  mismatch: {
    ja: "選択結果が一致しません。",
    en: "The selected result did not match.",
  },
  iconAlt: {
    ja: "Busycube Courierの架空アイコン",
    en: "Fictional Busycube Courier icon",
  },
  saveIcon: { ja: "アイコン画像を保存", en: "Save contact icon" },
  nameLabel: { ja: "name", en: "name" },
  emailLabel: { ja: "email", en: "email" },
  telLabel: { ja: "tel", en: "tel" },
  addressLabel: { ja: "address", en: "address" },
  iconLabel: { ja: "icon", en: "icon" },
});
