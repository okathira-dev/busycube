export interface Point {
  row: number;
  column: number;
}
export interface Maze {
  rows: string[];
  start: Point;
  exit: Point;
}
const directions = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
] as const;
export function generateMaze(installationId: string): Maze {
  let seed = 2166136261;
  for (const byte of new TextEncoder().encode(
    `busycube:S-670:1\0${installationId}`,
  ))
    seed = Math.imul(seed ^ byte, 16777619) >>> 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  // Ten by ten passage cells, with a wall cell between adjacent cells.
  const side = 21;
  const board = Array.from({ length: side }, () =>
    Array<string>(side).fill("#"),
  );
  const start = { row: 1, column: 1 };
  const exit = { row: 19, column: 19 };
  const write = (row: number, column: number, value: string) => {
    const line = board[row];
    if (line) line[column] = value;
  };
  const at = (row: number, column: number) => board[row]?.[column];
  write(start.row, start.column, ".");
  const stack: Point[] = [start];
  while (stack.length) {
    const current = stack.at(-1);
    if (!current) break;
    const candidates = directions.filter(([dr, dc]) => {
      const r = current.row + dr * 2,
        c = current.column + dc * 2;
      return r > 0 && r < side - 1 && c > 0 && c < side - 1 && at(r, c) === "#";
    });
    const chosen = candidates[Math.floor(random() * candidates.length)];
    if (!chosen) {
      stack.pop();
      continue;
    }
    const [dr, dc] = chosen;
    const next = { row: current.row + dr * 2, column: current.column + dc * 2 };
    write(current.row + dr, current.column + dc, ".");
    write(next.row, next.column, ".");
    stack.push(next);
  }
  const degree = (r: number, c: number) =>
    directions.filter(([dr, dc]) => at(r + dr, c + dc) === ".").length;
  let branching = board.some((line, r) =>
    line.some((cell, c) => cell === "." && degree(r, c) >= 3),
  );
  // In the rare Hamiltonian-path result, open one inner crossway so the puzzle
  // still has a choice of route rather than a single unbranched corridor.
  for (let r = 1; r < side - 1 && !branching; r++) {
    for (let c = 1; c < side - 1 && !branching; c++) {
      if (at(r, c) !== "#") continue;
      for (const [dr, dc] of [
        [1, 0],
        [0, 1],
      ] as const) {
        if (
          at(r + dr, c + dc) === "." &&
          at(r - dr, c - dc) === "." &&
          degree(r + dr, c + dc) >= 2
        ) {
          write(r, c, ".");
          branching = true;
          break;
        }
      }
    }
  }
  write(start.row, start.column, "S");
  write(exit.row, exit.column, "E");
  return { rows: board.map((line) => line.join("")), start, exit };
}
export function move(
  maze: Maze,
  position: Point,
  dr: number,
  dc: number,
): Point {
  const next = { row: position.row + dr, column: position.column + dc };
  const cell = maze.rows[next.row]?.[next.column];
  return !cell || cell === "#" ? position : next;
}
export function consoleBoard(maze: Maze, position: Point): string {
  return `Busycube S-670 maze v1\n${maze.rows.map((line, row) => (row === position.row ? `${line.slice(0, position.column)}@${line.slice(position.column + 1)}` : line)).join("\n")}`;
}
