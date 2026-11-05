import { isPoint, type Level, type Point } from "./game";
import { isLevel, isOpponent } from "./room";

export const pendingKey = "busycube-ghosting-pending-v1";
export interface PendingShot {
  level: Level;
  opponent: string;
  aim: Point;
  keeper: Point;
}
export function isPendingShot(value: unknown): value is PendingShot {
  if (!value || typeof value !== "object") return false;
  const pending = value as Partial<PendingShot>;
  return (
    isLevel(pending.level) &&
    isOpponent(pending.opponent) &&
    isPoint(pending.aim) &&
    isPoint(pending.keeper)
  );
}
