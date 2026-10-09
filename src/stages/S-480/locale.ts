import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B01: { ja: "四隅の枠", en: "Corner frame" },
  B02: { ja: "四隅の枠", en: "Corner frame" },
  B03: {
    ja: "四隅の枠",
    en: "Corner frame",
  },
  B04: { ja: "四隅の枠", en: "Corner frame" },
  B05: { ja: "太陽", en: "Sun" },
  B06: { ja: "点線の四角", en: "Dotted square" },
  B07: { ja: "二本の縦線", en: "Two vertical bars" },
  B08: { ja: "斜線入りの目", en: "Crossed-out eye" },
  B09: { ja: "斜線入りWi-Fi", en: "Crossed-out Wi-Fi" },
  colorSchemeAction: { ja: "暗色へ", en: "Request dark" },
  contrastAction: { ja: "輪郭を強く", en: "Request more contrast" },
  motionAction: { ja: "動きを止める", en: "Request reduced motion" },
  transparencyAction: {
    ja: "透明を減らす",
    en: "Request reduced transparency",
  },
  dataAction: { ja: "通信を軽く", en: "Request reduced data" },
  clearPreferences: { ja: "上書きを戻す", en: "Clear overrides" },
  preferenceIdle: {
    ja: "下段は対応browserの設定要求です。",
    en: "The lower row requests browser-managed preferences.",
  },
  preferenceUnavailable: {
    ja: "この設定のUser Preferences APIは利用できません。",
    en: "This User Preferences setting is unavailable.",
  },
  preferenceInvalid: {
    ja: "browserが要求値を公開していません。",
    en: "The browser does not expose the requested value.",
  },
  preferenceApplied: {
    ja: "browserの設定と表示が切り替わりました。",
    en: "The browser preference and rendering changed.",
  },
  preferenceNotEffective: {
    ja: "要求は完了しましたが表示へ反映されていません。",
    en: "The request completed without changing the effective media query.",
  },
  preferenceRejected: {
    ja: "設定要求は拒否または取消されました。",
    en: "The preference request was rejected or cancelled.",
  },
  preferenceCleared: {
    ja: "このステージの上書きを戻しました。",
    en: "Stage preference overrides were cleared.",
  },
});
