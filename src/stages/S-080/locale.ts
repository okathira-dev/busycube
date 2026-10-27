import { defineStageLocale } from "../locale";
import { stageName } from "./name";

export const locale = defineStageLocale({
  stageName,
  answer: { ja: "数字", en: "Number" },
  submit: { ja: "答える", en: "Submit" },
  installed: { ja: "インストール済み", en: "Installed" },
  notInstalled: {
    ja: "インストールを検知していません",
    en: "Installation not detected",
  },
  B01: { ja: "画面と下向き矢印", en: "Screen with downward arrow" },
  B02: { ja: "バッジ付きBusycube", en: "Busycube with badge" },
  B03: { ja: "ショートカットの矢印", en: "Shortcut arrow" },
  B04: { ja: "紙と鉛筆", en: "Paper and pencil" },
  B05: { ja: "タブ付きブラウザーの窓", en: "Browser window with tabs" },
  B06: { ja: "窓（タイトルバー内）", en: "Window (in title bar)" },
});
