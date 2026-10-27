import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B02: { ja: "芽の出た鉢", en: "Pot with a sprout" },
  replant: { ja: "花を植え直す", en: "Replant the flower" },
  imageAlt: { ja: "温室の現在の植物", en: "Current greenhouse plant" },
  cleanup: { ja: "後片付けを再試行中", en: "Retrying background cleanup" },
});
