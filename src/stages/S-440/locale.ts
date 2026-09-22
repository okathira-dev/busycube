import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  saveBusycube: { ja: ".busycubeを保存", en: "Save .busycube" },
  B01: { ja: "ファイル起動の箱", en: "File-launch box" },
});
