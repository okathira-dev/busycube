import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  notificationBody: { ja: "矢印だけで進む", en: "Proceed with the arrows" },
  beginNotifications: { ja: "通知を始める", en: "Begin notifications" },
  B01: { ja: "ベル", en: "Bell" },
});
