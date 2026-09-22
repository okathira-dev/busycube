import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  installHint: {
    ja: "ブラウザの「アプリをインストール」または「ホーム画面に追加」でBusycubeを入れ、そのアイコンから開く。後の起動問題でもこのPWAを使う。",
    en: "Install Busycube with your browser's Install app or Add to Home Screen command, then open its icon. Later launch puzzles use this PWA too.",
  },
  B01: { ja: "別の入口の箱", en: "Installed-app box" },
});
