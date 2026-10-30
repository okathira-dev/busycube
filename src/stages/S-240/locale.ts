import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  share: { ja: "印を渡す", en: "Share the mark" },
  install: {
    ja: "受取先: インストールしたBusycube",
    en: "Receive with installed Busycube",
  },
  B03: { ja: "受信箱", en: "Inbox" },
  receiving: { ja: "印を受け取っています…", en: "Receiving shared mark…" },
  noMatch: { ja: "一致する印がありません", en: "No matching shared mark" },
  receiveFailed: { ja: "受け取れませんでした", en: "Unable to receive" },
});
