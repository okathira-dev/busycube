import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  sharedScreen: { ja: "共有画面のプレビュー", en: "Shared screen preview" },
  noAudio: { ja: "音声なし", en: "No audio" },
  captureScreen: { ja: "画面を映す", en: "Share a screen" },
  openMap: { ja: "地図を開く", en: "Open the map" },
  browserOnly: {
    ja: "ブラウザータブ共有を確認できません",
    en: "Browser tab sharing could not be confirmed",
  },
  explore: { ja: "探索領域", en: "Exploration area" },
  B05: { ja: "四隅", en: "Four corners" },
  B06: { ja: "地球と虫眼鏡", en: "Globe and magnifier" },
});
