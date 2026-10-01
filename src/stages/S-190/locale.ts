import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  relayedScreen: { ja: "中継された画面", en: "Relayed screen" },
  sharedScreen: { ja: "共有画面のプレビュー", en: "Shared screen preview" },
  noAudio: { ja: "音声なし", en: "No audio" },
  captureScreen: { ja: "画面を映す", en: "Capture a screen" },
  openObserver: { ja: "観測窓を開く", en: "Open observer" },
  openMap: { ja: "地図を開く", en: "Open the map" },
  B01: { ja: "二つの画面", en: "Two screens" },
  B02: { ja: "二つの画面", en: "Two screens" },
  B03: { ja: "窓", en: "Window" },
  B04: { ja: "スポイト", en: "Eyedropper" },
});
