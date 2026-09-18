import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  notificationBody: { ja: "矢印だけで進む", en: "Proceed with the arrows" },
  beginNotifications: { ja: "通知を始める", en: "Begin notifications" },
  B01: { ja: "通知操作の箱", en: "Notification-actions box" },
});
