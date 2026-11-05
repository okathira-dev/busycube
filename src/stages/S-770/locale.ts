import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "身分証", en: "Identity card" },
  cancel: { ja: "取消", en: "Cancel" },
  unconfigured: { ja: "準備されていません", en: "Not configured" },
  privacy: {
    ja: "受け取った結果は判定だけに使い、アカウント情報やトークンは表示・保存・送信しません。",
    en: "The result is used only for this check. Account data and tokens are not shown, stored or forwarded.",
  },
});
