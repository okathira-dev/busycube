import {
  consoleBoard,
  generateMaze,
  type Maze,
  move,
  type Point,
} from "./maze";

function reachable(maze: Maze) {
  const points = [maze.start];
  const seen = new Set([`${maze.start.row},${maze.start.column}`]);
  let branch = false;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p) continue;
    const neighbours: Point[] = [];
    for (const [dr, dc] of [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ]) {
      if (dr === undefined || dc === undefined) continue;
      const next = move(maze, p, dr, dc);
      if (next === p) continue;
      neighbours.push(next);
      const key = `${next.row},${next.column}`;
      if (!seen.has(key)) {
        seen.add(key);
        points.push(next);
      }
    }
    if (neighbours.length >= 3) branch = true;
  }
  return { points, seen, branch };
}
it("always produces bounded connected passages, a reachable exit and a real branch across 512 deterministic seeds", () => {
  for (let seed = 0; seed < 512; seed++) {
    const maze = generateMaze(`fixture-${seed}`);
    expect(maze.rows).toHaveLength(21);
    expect(
      maze.rows.every((line) => line.length === 21 && /^[#.SE]+$/.test(line)),
    ).toBe(true);
    const result = reachable(maze);
    const floors = maze.rows.reduce(
      (n, line) => n + [...line].filter((cell) => cell !== "#").length,
      0,
    );
    expect(result.points).toHaveLength(floors);
    expect(result.seen.has(`${maze.exit.row},${maze.exit.column}`)).toBe(true);
    expect(result.branch).toBe(true);
    expect(maze.rows[0]).toBe("#".repeat(21));
    expect(maze.rows[20]).toBe("#".repeat(21));
    expect(
      maze.rows.every((row) => row.startsWith("#") && row.endsWith("#")),
    ).toBe(true);
  }
});
it("reproduces the same ID/version and ordinarily varies across saved environments", () => {
  const boards = Array.from({ length: 32 }, (_, i) =>
    generateMaze(`installation-${i}`).rows.join("\n"),
  );
  expect(new Set(boards).size).toBe(32);
  expect(generateMaze("installation-7")).toEqual(
    generateMaze("installation-7"),
  );
});
it("Console draws the actual maze with exactly one current marker while blocked moves retain location", () => {
  const maze = generateMaze("console-fixture");
  const point = maze.start;
  expect(move(maze, point, -1, 0)).toBe(point);
  for (const p of reachable(maze).points) {
    const printed = consoleBoard(maze, p).split("\n").slice(1);
    expect(printed.join("").match(/@/g)).toHaveLength(1);
    for (let r = 0; r < 21; r++)
      for (let c = 0; c < 21; c++)
        expect(printed[r]?.[c]).toBe(
          r === p.row && c === p.column ? "@" : maze.rows[r]?.[c],
        );
  }
  expect(consoleBoard(maze, point)).not.toContain("console-fixture");
});
