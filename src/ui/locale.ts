import { defineLocale } from "../i18n";

export const uiLocale = defineLocale({
  primaryNav: { ja: "メインナビゲーション", en: "Primary navigation" },
  privacyPermissions: {
    ja: "プライバシーと権限",
    en: "Privacy and permissions",
  },
  stageLoading: { ja: "ステージを読み込んでいます…", en: "Loading stage…" },
  viewLoading: { ja: "画面を読み込んでいます…", en: "Loading view…" },
  viewLoadFailed: {
    ja: "画面を読み込めませんでした。接続を確認して再読み込みするか、別の画面へ移動してください。",
    en: "This view could not be loaded. Check your connection and reload, or navigate to another view.",
  },
  stageRetry: { ja: "再試行", en: "Retry" },
  stageAccessDirect: { ja: "すぐプレイ", en: "Play now" },
  stageAccessPermission: { ja: "権限が必要", en: "Permission required" },
  stageAccessLimited: { ja: "対応環境限定", en: "Limited browser support" },
  stageCrashed: {
    ja: "この箱は応答を停止しました。一覧へ戻って、もう一度試してください。",
    en: "This box stopped responding. Return to the box room and try again.",
  },
  clusterInput: { ja: "入力と文字", en: "Input & text" },
  clusterLifecycle: { ja: "ページの往来", en: "Page journeys" },
  clusterMedia: { ja: "音・映像・通知", en: "Media & notices" },
  clusterPwa: { ja: "ファイル・PWA・認証", en: "Files, PWA & identity" },
  clusterHardware: { ja: "端末と周辺機器", en: "Device & hardware" },
  clusterSensors: { ja: "位置とセンサー", en: "Location & sensors" },
});

export type UiLocaleKey = keyof typeof uiLocale;
export type StageMapClusterLabel =
  | "clusterInput"
  | "clusterLifecycle"
  | "clusterMedia"
  | "clusterPwa"
  | "clusterHardware"
  | "clusterSensors";

export function uiText(locale: "ja" | "en", key: UiLocaleKey): string {
  return uiLocale[key][locale];
}
