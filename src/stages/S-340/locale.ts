import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  connectShapes: { ja: "形をつなぐ", en: "Connect the shapes" },
  B01: { ja: "画面遷移の箱", en: "View-transition box" },
});
