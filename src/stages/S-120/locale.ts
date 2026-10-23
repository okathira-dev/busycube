import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  seeSound: { ja: "音の形を見る", en: "See the sound" },
  B01: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
});
