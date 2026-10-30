import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  microphone: { ja: "マイク", en: "Microphone" },
  processingEnabled: {
    ja: "入力補正が有効です。",
    en: "Input processing is enabled.",
  },
  processingUnknown: {
    ja: "入力補正の設定は確認できません。",
    en: "Input processing settings are unreported.",
  },
  B02: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
});
