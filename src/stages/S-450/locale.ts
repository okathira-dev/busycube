import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  sendPrivateSignal: { ja: "専用の合図を送る", en: "Send the private signal" },
  B01: { ja: "プロトコルの箱", en: "Protocol box" },
});
