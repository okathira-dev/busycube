import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  passkeyAccount: { ja: "passkeyアカウント", en: "Passkey account" },
  passkeyNote: {
    ja: "作成したpasskeyは端末のpasskey管理画面に残る。遊び終えたらBusycube用passkeyをそこで削除できる。",
    en: "The created passkey remains in your device's passkey manager. You can remove the Busycube passkey there after playing.",
  },
  waitingEnded: { ja: "待機を終了しました", en: "Waiting ended" },
  B01: { ja: "鍵と＋", en: "Key with plus" },
  B02: { ja: "開いた錠前", en: "Open padlock" },
  B04: { ja: "斜線付きの鍵", en: "Key with slash" },
});
