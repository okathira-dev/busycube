import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B02: { ja: "砂時計", en: "Hourglass" },
  diagram: {
    ja: "加速度の大きさと中央の目標領域",
    en: "Acceleration magnitude and central target region",
  },
});
