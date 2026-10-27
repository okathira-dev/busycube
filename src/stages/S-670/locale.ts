import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  controls: { ja: "方向キー", en: "Directional controls" },
  up: { ja: "上向き矢印", en: "Up arrow" },
  left: { ja: "左向き矢印", en: "Left arrow" },
  down: { ja: "下向き矢印", en: "Down arrow" },
  right: { ja: "右向き矢印", en: "Right arrow" },
  reset: { ja: "回転する矢印", en: "Rotating arrow" },
  B01: { ja: "山括弧と下線", en: "Angle bracket and underscore" },
});
