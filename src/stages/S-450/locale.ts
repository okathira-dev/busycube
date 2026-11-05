import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "枠から出る矢印", en: "Arrow leaving a square" },
  B02: { ja: "鎖の輪", en: "Chain links" },
  install: { ja: "アプリの入口", en: "App entrance" },
  unregister: { ja: "wtaiの受け口を解除", en: "Remove the wtai handler" },
  impact: {
    ja: "鎖の箱は、このサイトをwtaiリンクの受け口としてブラウザーへ登録します。既存の関連付けに影響する場合があります。ゲーム用の合図だけを扱い、発信や電話帳操作は行いません。",
    en: "The chain box asks the browser to register this site for wtai links. This may affect an existing association. Only a game signal is used; there is no call or address-book operation.",
  },
  cleanup: {
    ja: "wtaiの受け口は解除ボタン、またはブラウザーのプロトコルハンドラー設定で削除できます。PWA側の関連付けはアプリ設定で管理できます。",
    en: "Remove the wtai handler here or in your browser's protocol-handler settings. Manage the PWA association in app settings.",
  },
});
