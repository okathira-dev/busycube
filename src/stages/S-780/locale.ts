import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  cancel: { ja: "取消", en: "Cancel" },
  B01: { ja: "丸の中のチェック", en: "Check inside a circle" },
  B02: { ja: "丸の中のばつ", en: "Cross inside a circle" },
  B03: { ja: "回転矢印", en: "Rotating arrow" },
  B04: { ja: "財布", en: "Wallet" },
});
