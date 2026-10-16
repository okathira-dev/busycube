import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  passkeyAccount: { ja: "passkeyアカウント", en: "Passkey account" },
  passkeyNote: {
    ja: "作成したpasskeyは端末のpasskey管理画面に残る。遊び終えたらBusycube用passkeyをそこで削除できる。",
    en: "The created passkey remains in your device's passkey manager. You can remove the Busycube passkey there after playing.",
  },
  browserError: { ja: "ブラウザエラー", en: "Browser error" },
  B01: { ja: "紙と上向き矢印", en: "File with upward arrow" },
  B02: { ja: "錠前", en: "Padlock" },
  B03: { ja: "錠前", en: "Padlock" },
});
