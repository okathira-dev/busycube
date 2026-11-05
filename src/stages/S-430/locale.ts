import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  stop: { ja: "停止", en: "Stop" },
  mute: { ja: "消音", en: "Mute" },
  unmute: { ja: "消音解除", en: "Unmute" },
  player: { ja: "プレイヤー", en: "Player" },
  position: { ja: "再生位置", en: "Playback position" },
  interrupted: { ja: "割り込み中", en: "Interrupted" },
  pipUnknown: {
    ja: "PiPの要求理由は不明です",
    en: "The PiP request reason is unknown",
  },
  pipAutomatic: { ja: "自動PiPの要求", en: "Automatic PiP request" },
  B01: { ja: "二本の縦線", en: "Two vertical bars" },
  B02: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
  B03: { ja: "三角", en: "Triangle" },
  B04: { ja: "四角", en: "Square" },
  B05: { ja: "右向きの二重三角", en: "Double triangle pointing right" },
  B06: { ja: "左向きの二重三角", en: "Double triangle pointing left" },
  B07: { ja: "左三角と縦線", en: "Left triangle with vertical bar" },
  B08: { ja: "右三角と縦線", en: "Right triangle with vertical bar" },
  B09: { ja: "線上のつまみ", en: "Knob on a line" },
  B10: {
    ja: "小さな窓が重なる画面",
    en: "Screen with a small overlapping window",
  },
});
