import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  vaultBody: {
    ja: "← → で入力し、本文で提出",
    en: "Enter with ← →, submit with the body",
  },
  sendVault: { ja: "金庫を外へ出す", en: "Send the vault outside" },
  B01: { ja: "金庫の箱", en: "Vault box" },
});
