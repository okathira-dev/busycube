// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { generateMaze } from "./maze";
import { stage } from "./stage";

const id = "maze-stage-fixture";
function fixture(installationId: string | undefined = id) {
  const solve = vi.fn();
  const controller = new AbortController();
  const definition = stage.boxes.B01;
  if (!definition) throw new Error("Missing box");
  const p: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    services: { installationId },
    boxes: { B01: { id: "B01", definition, state: "ribboned", solve } },
    progress: { hasMarker: () => false, mark: vi.fn() },
  };
  return { p, solve, controller };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("waits for the shared game ID without printing a fallback maze or instructions", () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const f = fixture();
  f.p.services = {};
  const view = render(<stage.Component {...f.p} />);
  expect(log).not.toHaveBeenCalled();
  expect(view.container.querySelector(".s670-controls")).toBeNull();
  expect(f.solve).not.toHaveBeenCalled();
});
it("prints the actual current board, reacts to walls without progress, resets the same maze and ignores actions after abort", () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const f = fixture();
  const view = render(<stage.Component {...f.p} />);
  const initial = log.mock.calls[0]?.[0];
  expect(initial).toContain("Busycube S-670 maze v1");
  expect(view.container.textContent).not.toMatch(
    /console|printed|open.*board/i,
  );
  fireEvent.click(screen.getByRole("button", { name: "Up arrow" }));
  expect(view.container.querySelector("output")?.textContent).toBe("1:1");
  expect(f.solve).not.toHaveBeenCalled();
  expect(log).toHaveBeenLastCalledWith(initial);
  fireEvent.click(screen.getByRole("button", { name: "Rotating arrow" }));
  expect(log).toHaveBeenLastCalledWith(initial);
  f.controller.abort();
  const calls = log.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Right arrow" }));
  expect(log).toHaveBeenCalledTimes(calls);
});
it("opens only at the generated exit, using the same cells shown in Console", () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const f = fixture();
  render(<stage.Component {...f.p} />);
  const maze = generateMaze(id);
  const paths = [{ row: 1, column: 1, path: [] as string[] }];
  const seen = new Set(["1,1"]);
  let solution: string[] = [];
  for (const p of paths) {
    if (p.row === maze.exit.row && p.column === maze.exit.column) {
      solution = p.path;
      break;
    }
    for (const [dr, dc, name] of [
      [-1, 0, "Up arrow"],
      [1, 0, "Down arrow"],
      [0, -1, "Left arrow"],
      [0, 1, "Right arrow"],
    ] as const) {
      const r = p.row + dr,
        c = p.column + dc,
        key = `${r},${c}`;
      if (!maze.rows[r]?.[c] || maze.rows[r]?.[c] === "#" || seen.has(key))
        continue;
      seen.add(key);
      paths.push({ row: r, column: c, path: [...p.path, name] });
    }
  }
  expect(solution.length).toBeGreaterThan(10);
  for (const name of solution.slice(0, -1))
    fireEvent.click(screen.getByRole("button", { name }));
  expect(f.solve).not.toHaveBeenCalled();
  const last = solution.at(-1);
  if (!last) throw new Error("No route");
  fireEvent.click(screen.getByRole("button", { name: last }));
  expect(f.solve).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Rotating arrow" }));
  expect(screen.getByText("1:1")).toBeTruthy();
});
