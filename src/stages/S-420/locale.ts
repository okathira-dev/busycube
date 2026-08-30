import { defineStageLocale } from "../locale";

export const locale = defineStageLocale({
  stageName: { ja: "通知の金庫", en: "Notification vault" },
  vaultBody: {
    ja: "← → で入力し、本文で提出",
    en: "Enter with ← →, submit with the body",
  },
  sendVault: { ja: "金庫を外へ出す", en: "Send the vault outside" },
  B01: { ja: "金庫の箱", en: "Vault box" },
});
