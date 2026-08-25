import { defineStageLocale } from "../locale";

/** S-440 のステージ固有コピー。表示文言はここから追加する。 */
export const locale = defineStageLocale({
  stageName: { ja: ".busycubeの入口", en: "The .busycube entrance" },
  saveBusycube: { ja: ".busycubeを保存", en: "Save .busycube" },
  B01: { ja: "ファイル起動の箱", en: "File-launch box" },
});
