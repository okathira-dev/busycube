import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  B04: { ja: "回る端末", en: "Rotating device" },
  B05: { ja: "回る端末", en: "Rotating device" },
  B06: { ja: "回る端末", en: "Rotating device" },
  x: {
    ja: "左右の軸を中心とする回転と一周の進捗",
    en: "Rotation around the horizontal axis and full-turn progress",
  },
  y: {
    ja: "上下の軸を中心とする回転と一周の進捗",
    en: "Rotation around the vertical axis and full-turn progress",
  },
  z: {
    ja: "画面に垂直な軸を中心とする回転と一周の進捗",
    en: "Rotation around the screen-normal axis and full-turn progress",
  },
});
