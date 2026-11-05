import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  geolocation: { ja: "位置情報", en: "Geolocation" },
  notifications: { ja: "通知", en: "Notifications" },
  camera: { ja: "カメラ", en: "Camera" },
  microphone: { ja: "マイク", en: "Microphone" },
  accelerometer: { ja: "加速度", en: "Accelerometer" },
  gyroscope: { ja: "ジャイロ", en: "Gyroscope" },
  "local-fonts": { ja: "ローカルフォント", en: "Local fonts" },
  "clipboard-read": { ja: "クリップボード読み取り", en: "Clipboard reading" },
  "idle-detection": { ja: "アイドル検出", en: "Idle detection" },
  "clipboard-write": { ja: "クリップボード書き込み", en: "Clipboard writing" },
  unknown: { ja: "確認できません", en: "Cannot confirm" },
  request: { ja: "許可を要求・確認", en: "Request / check permission" },
  recheck: { ja: "許可を再確認", en: "Recheck permission" },
  fontsNotice: {
    ja: "許可の要求時にフォント一覧を取得して破棄します。内容は表示・保存・送信しません。",
    en: "Requesting access reads and discards the font list. Its contents are not displayed, saved, or sent.",
  },
  clipboardNotice: {
    ja: "許可の要求時にクリップボードのテキストを読み取って破棄します。内容は表示・保存・送信しません。",
    en: "Requesting access reads and discards clipboard text. Its contents are not displayed, saved, or sent.",
  },
  writeNotice: {
    ja: "未許可の場合はブラウザーのサイト設定を変更して再確認してください。内容は上書きしません。",
    en: "If permission is not granted, change this site's browser settings and recheck. Clipboard contents are not overwritten.",
  },
  settingsNotice: {
    ja: "拒否された権限はブラウザーやOSの設定で変更できます。ここでの許可は、ほかの機能が必ず使えることを保証するものではありません。",
    en: "Denied permissions can be changed in browser or OS settings. Permission here does not guarantee that other features will be available.",
  },
  B01: { ja: "点を結ぶ道", en: "Path connecting dots" },
  B02: { ja: "ベル", en: "Bell" },
  B03: { ja: "二つの画面", en: "Two screens" },
  B04: { ja: "音波の出るスピーカー", en: "Speaker with sound waves" },
  B05: { ja: "センサー", en: "Sensors" },
  B06: { ja: "回る端末", en: "Rotating device" },
  B07: { ja: "文字", en: "Text fields" },
  B08: { ja: "クリップボード", en: "Clipboard" },
  B09: { ja: "砂時計", en: "Hourglass" },
  B10: { ja: "二枚の紙", en: "Two sheets" },
});
