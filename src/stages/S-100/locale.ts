import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  phone: { ja: "スマートフォン", en: "Smartphone" },
  B02: { ja: "画面の回転", en: "Screen rotation" },
});
