export interface Point {
  x: number;
  y: 0.5;
}
export function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<Point>;
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y === 0.5
  );
}

export type Level = "easy" | "medium" | "hard";
export type Victories = Record<Level, boolean>;
export function recordVictory(
  victories: Victories,
  level: Level,
  shotOnline: boolean,
): Victories {
  if (level === "hard" && shotOnline) return victories;
  return { ...victories, [level]: true };
}
export type Phase = "ready" | "flying" | "lagging" | "goal" | "saved";
export interface Game {
  level: Level;
  aim: Point;
  keeper: Point;
  direction: number;
  phase: Phase;
  flight: number;
  shotOnline: boolean;
}
export const flightTime = 0.48;
export const lagFraction = 0.2;
export function createGame(level: Level = "easy"): Game {
  return {
    level,
    aim: { x: 0.5, y: 0.5 },
    keeper: { x: 0.5, y: 0.5 },
    direction: 1,
    phase: "ready",
    flight: 0,
    shotOnline: true,
  };
}
export function aimAt(game: Game, x: number): Game {
  if (game.phase !== "ready") return game;
  return { ...game, aim: { x: Math.max(0, Math.min(1, x)), y: 0.5 } };
}
export function kick(game: Game, online: boolean): Game {
  if (game.phase !== "ready") return game;
  return {
    ...game,
    phase: !online ? "lagging" : "flying",
    flight: 0,
    shotOnline: online,
  };
}
export function advance(game: Game, seconds: number, online: boolean): Game {
  if (game.phase === "lagging") {
    if (online)
      return advance(
        { ...game, phase: "flying", flight: flightTime * lagFraction },
        seconds,
        online,
      );
    // Repeat just the launch segment over 600ms, without advancing the keeper.
    return {
      ...game,
      flight:
        (game.flight + (seconds * flightTime * lagFraction) / 0.6) %
        (flightTime * lagFraction),
    };
  }
  if (game.phase !== "ready" && game.phase !== "flying") return game;
  if (game.phase === "flying" && !game.shotOnline && !online)
    return advance({ ...game, phase: "lagging", flight: 0 }, seconds, online);
  const dt =
    game.phase === "flying"
      ? Math.min(seconds, flightTime - game.flight)
      : seconds;
  let { keeper, direction } = game;
  const patrol =
    (game.level !== "hard" && game.phase === "ready") ||
    (game.level === "easy" && game.phase === "flying" && game.shotOnline);
  if (patrol) {
    let x = keeper.x + direction * dt * 0.48;
    const min = game.level === "medium" ? 0.31 : 0.12;
    const max = 1 - min;
    while (x > max || x < min) {
      if (x > max) {
        x = 2 * max - x;
        direction = -1;
      } else {
        x = 2 * min - x;
        direction = 1;
      }
    }
    keeper = { x, y: 0.5 };
  } else if (game.phase === "flying" || online) {
    const speed =
      game.level === "hard" && (game.phase === "ready" || game.shotOnline)
        ? 3
        : 0.62;
    keeper = {
      x:
        keeper.x +
        Math.sign(game.aim.x - keeper.x) *
          Math.min(Math.abs(game.aim.x - keeper.x), dt * speed),
      y: 0.5,
    };
  }
  const flight = game.phase === "flying" ? game.flight + dt : 0;
  let phase: Phase = game.phase;
  if (phase === "flying" && flight >= flightTime - 0.000001)
    phase = Math.abs(game.aim.x - keeper.x) < 0.14 ? "saved" : "goal";
  if (
    keeper.x === game.keeper.x &&
    direction === game.direction &&
    flight === game.flight &&
    phase === game.phase
  )
    return game;
  return { ...game, keeper, direction, flight, phase };
}
