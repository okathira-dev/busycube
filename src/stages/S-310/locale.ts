import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  relaunchHint: {
    ja: "インストールしたBusycubeへ、このURLからもう一度入る。",
    en: "Open this URL into the installed Busycube again.",
  },
  launchUrl: { ja: "起動用URL", en: "Launch URL" },
  B01: {
    ja: "枠から出る矢印",
    en: "Arrow leaving a square",
  },
  B02: {
    ja: "枠から出る矢印",
    en: "Arrow leaving a square",
  },
  B03: {
    ja: "枠から出る矢印",
    en: "Arrow leaving a square",
  },
});
