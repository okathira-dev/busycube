import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  sendKey: { ja: "鍵を外へ", en: "Send key outside" },
  returnKey: { ja: "鍵を戻す", en: "Bring key back" },
  B01: { ja: "鍵を外へ出す箱", en: "Export-key box" },
  B02: { ja: "鍵を戻す箱", en: "Import-key box" },
});
