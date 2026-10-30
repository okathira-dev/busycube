import { defineStageLocale } from "../locale";

export const locale = defineStageLocale({
  B03: { ja: "折り返す矢印", en: "Bent arrow" },
  B02: { ja: "斜線入りWi-Fi", en: "Crossed-out Wi-Fi" },
  point: { ja: "点", en: "Point" },
  waitingWorker: {
    ja: "Service Workerの準備を待っています。",
    en: "Waiting for the service worker.",
  },
  rejected: { ja: "送信を開始できません。", en: "Could not start sending." },
  receiptUnavailable: {
    ja: "受領を確認できません。",
    en: "Receipt could not be confirmed.",
  },
});
