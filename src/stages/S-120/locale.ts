import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  seeSound: { ja: "音の形を見る", en: "See the sound" },
  B01: { ja: "音の箱", en: "Sound box" },
});
