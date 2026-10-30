import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B02: { ja: "点線の四角", en: "Dotted square" },
  start: { ja: "XR空間を開く", en: "Enter immersive XR" },
  end: { ja: "XRを終了", en: "End XR" },
  canvas: { ja: "XR空間の表示", en: "Immersive XR view" },
  idle: { ja: "準備完了", en: "Ready" },
  starting: { ja: "XRを開始しています…", en: "Starting XR…" },
  preparing: { ja: "XRを準備しています…", en: "Preparing XR…" },
  active: { ja: "XRを開始しました。", en: "XR is active." },
  selected: { ja: "XR空間の箱が開きました。", en: "The box in XR opened." },
  unsupported: {
    ja: "immersive AR / VR機器を利用できません。",
    en: "No immersive AR or VR device is available.",
  },
  cancelled: {
    ja: "XRの開始は取消または拒否されました。",
    en: "XR entry was cancelled or denied.",
  },
  failed: {
    ja: "XRを開始・継続できませんでした。",
    en: "XR could not start or continue.",
  },
  ended: { ja: "XRを終了しました。", en: "The XR session ended." },
});
