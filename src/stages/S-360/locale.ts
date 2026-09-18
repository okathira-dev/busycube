import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  openReceiver: { ja: "受信側を開く", en: "Open receiver" },
  closeConnection: { ja: "接続を閉じる", en: "Close connection" },
  B01: { ja: "接続の箱", en: "Connection box" },
  B02: { ja: "切断の箱", en: "Disconnect box" },
});
