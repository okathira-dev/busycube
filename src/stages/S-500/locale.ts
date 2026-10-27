import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  returnHere: { ja: "ここへ戻す", en: "Return it here" },
  B02: { ja: "点線の四角", en: "Dotted square" },
});
