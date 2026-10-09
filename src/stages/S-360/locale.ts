import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  openReceiver: { ja: "受信側を開く", en: "Open receiver" },
  closeConnection: { ja: "接続を閉じる", en: "Close connection" },
  B01: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
  B02: { ja: "窓", en: "Window" },
});
