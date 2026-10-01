import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  geolocation: { ja: "位置情報", en: "geolocation" },
  notifications: { ja: "通知", en: "notifications" },
  camera: { ja: "カメラ", en: "camera" },
  microphone: { ja: "マイク", en: "microphone" },
  requested: { ja: "要求済み", en: "requested" },
  denied: { ja: "拒否または利用不可", en: "denied or unavailable" },
  unknown: { ja: "不明", en: "unknown" },
  B01: { ja: "点を結ぶ道", en: "Path connecting dots" },
  B02: { ja: "ベル", en: "Bell" },
  B03: { ja: "二つの画面", en: "Two screens" },
  B04: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
});
