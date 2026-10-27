import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  release: { ja: "解除", en: "Release" },
  waiting: { ja: "待機", en: "Waiting" },
  holding: { ja: "保持中", en: "Holding" },
  released: { ja: "解放済み", en: "Released" },
  unavailable: { ja: "Wake Lockを利用できません", en: "Wake Lock unavailable" },
  B03: { ja: "日差し", en: "Sun rays" },
});
