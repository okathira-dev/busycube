import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  unavailable: {
    ja: "この環境ではCPU Pressureを購読できない",
    en: "CPU Pressure is unavailable in this environment",
  },
  observing: { ja: "CPU状態を自動観測中…", en: "Observing CPU pressure…" },
  observeFailed: {
    ja: "CPU状態を購読できない",
    en: "Could not observe CPU pressure",
  },
  idle: {
    ja: "ステージを開くと自動観測。ゲーム側で負荷は発生させない",
    en: "Observation starts on entry; the game creates no load",
  },
  cpuPrefix: { ja: "CPU状態", en: "CPU state" },
  B01: { ja: "チップ", en: "Chip" },
  B02: { ja: "チップ", en: "Chip" },
  B03: { ja: "チップ", en: "Chip" },
});
