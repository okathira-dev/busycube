import { defineStageLocale } from "../locale";
import { stageName } from "./name";
export const locale = defineStageLocale({
  stageName,
  B01: { ja: "向かい合う人", en: "Facing players" },
  local: { ja: "ローカル対戦", en: "Local match" },
  online: { ja: "オンライン対戦", en: "Online match" },
  development: { ja: "開発中", en: "In development" },
  waiting: { ja: "対戦相手を待っています", en: "Waiting for an opponent" },
  joining: { ja: "接続中", en: "Connecting" },
  rock: { ja: "グー", en: "Rock" },
  scissors: { ja: "チョキ", en: "Scissors" },
  paper: { ja: "パー", en: "Paper" },
  draw: { ja: "あいこ", en: "Draw" },
  wins: { ja: "勝利", en: "wins" },
  next: { ja: "次の勝負", en: "Next round" },
  restart: { ja: "ロビーへ", en: "Return to lobby" },
  opponent: { ja: "相手", en: "Opponent" },
});
