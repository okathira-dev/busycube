import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "向かい合う人", en: "Facing players" },
  waiting: { ja: "対戦相手を探しています", en: "Finding an opponent" },
  joining: { ja: "接続中", en: "Connecting" },
  rock: { ja: "グー", en: "Rock" },
  scissors: { ja: "チョキ", en: "Scissors" },
  paper: { ja: "パー", en: "Paper" },
  draw: { ja: "あいこ", en: "Draw" },
  win: { ja: "勝利", en: "Victory" },
  loss: { ja: "敗北", en: "Defeat" },
  next: { ja: "次の対戦", en: "Next match" },
  play: { ja: "対戦する", en: "Find match" },
  restart: { ja: "タイトルへ", en: "Return to title" },
  opponent: { ja: "相手", en: "Opponent" },
  rankings: { ja: "レート戦ランキング", en: "Rated rankings" },
  group: {
    ja: "グループ42",
    en: "GROUP 42",
  },
  freePlay: { ja: "フリープレイ · レート変動なし", en: "FREE PLAY · Unrated" },
  username: { ja: "ユーザー名", en: "Username" },
  saveName: { ja: "変更する", en: "Save name" },
  nameHelp: {
    ja: "文字・数字・_・-で1〜20文字",
    en: "1–20 letters, numbers, _ or -",
  },
  nameError: {
    ja: "ユーザー名に使える文字と長さを確認してください。",
    en: "Check the username characters and length.",
  },
  history: { ja: "最近の戦績", en: "Recent matches" },
  rule: {
    ja: "三連勝でチャレンジ達成。敗北・あいこで連勝リセット。",
    en: "Win three in a row. A defeat or draw resets your streak.",
  },
  ready: { ja: "手を選んでください", en: "Choose your hand" },
  selected: { ja: "相手の手を待っています", en: "Waiting for their hand" },
  clear: { ja: "三連勝達成！", en: "Challenge complete!" },
});
