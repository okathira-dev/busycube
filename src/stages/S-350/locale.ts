import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  videoToOperate: { ja: "操作する映像", en: "Video to operate" },
  B01: { ja: "時計", en: "Clock" },
  B02: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
  B03: { ja: "二本の縦線", en: "Two vertical bars" },
  B04: { ja: "速度計", en: "Speedometer" },
  B05: { ja: "字幕線", en: "Caption lines" },
  B06: { ja: "小さな窓が重なる画面", en: "Screen with inset window" },
  B08: { ja: "外向きの四隅", en: "Outward corners" },
});
