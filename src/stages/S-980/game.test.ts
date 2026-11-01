import {
  advance,
  aimAt,
  createGame,
  flightTime,
  kick,
  lagFraction,
} from "./game";

it("patrols independently of the aim in both beginner and intermediate", () => {
  for (const level of ["easy", "medium"] as const) {
    const left = aimAt(createGame(level), 0.17);
    const right = aimAt(createGame(level), 0.83);
    const moving = advance(left, 0.2, true);
    expect(moving.keeper).toEqual(advance(right, 0.2, true).keeper);
    expect(moving.keeper.x).toBeGreaterThan(0.5);
    let current = moving;
    const positions: number[] = [];
    for (let step = 0; step < 300; step++) {
      current = advance(current, 0.01, true);
      positions.push(current.keeper.x);
    }
    const min = level === "medium" ? 0.31 : 0.12;
    const max = 1 - min;
    expect(Math.min(...positions)).toBeGreaterThanOrEqual(min);
    expect(Math.min(...positions)).toBeLessThan(min + 0.01);
    expect(Math.max(...positions)).toBeLessThanOrEqual(max);
    expect(Math.max(...positions)).toBeGreaterThan(max - 0.01);
  }
});

it("intermediate reacts only after the kick and still allows shots away from its patrol position", () => {
  const patrol = advance(aimAt(createGame("medium"), 0.02), 0.3, true);
  expect(patrol.keeper.x).toBeGreaterThan(0.6);
  expect(patrol.keeper.x).toBeLessThan(0.69);
  const towardBall = advance(kick(patrol, true), 0.16, true);
  expect(towardBall.keeper.x).toBeLessThan(patrol.keeper.x);
  expect(towardBall.phase).toBe("flying");
  expect(advance(towardBall, 0.32, true).phase).toBe("goal");
  expect(
    advance(kick(aimAt(patrol, patrol.keeper.x), true), 0.48, true).phase,
  ).toBe("saved");
});

it("advanced tracks fast without teleporting and catches even an immediate opposite shot online", () => {
  const game = aimAt(createGame("hard"), 0.02);
  expect(game.keeper.x).toBe(0.5);
  const moving = advance(game, 0.016, true);
  expect(moving.keeper.x).toBeLessThan(0.5);
  expect(moving.keeper.x).toBeGreaterThan(game.aim.x);
  for (const x of [0, 0.12, 0.5, 0.87, 1]) {
    const target = aimAt(
      { ...createGame("hard"), keeper: { x: 1 - x, y: 0.5 } },
      x,
    );
    expect(advance(kick(target, true), flightTime, true).phase).toBe("saved");
    expect(advance(kick(target, true), flightTime, false).phase).toBe("saved");
  }
});

it("loops the first fifth while offline and resumes only on reconnection", () => {
  const game = kick(aimAt(createGame("hard"), 0.08), false);
  const part = advance(game, 0.3, false);
  expect(part.phase).toBe("lagging");
  expect(part.flight / flightTime).toBeCloseTo(0.1);
  expect(part.keeper).toEqual(game.keeper);
  const loop = advance(part, 0.4, false);
  expect(loop.phase).toBe("lagging");
  expect(loop.flight / flightTime).toBeLessThan(lagFraction);
  expect(advance(loop, 0, true).phase).toBe("flying");
});

it("resumes an offline shot with intermediate reaction and judges the actual goal or save", () => {
  const game = kick(
    aimAt({ ...createGame("hard"), keeper: { x: 0.85, y: 0.5 } }, 0.12),
    false,
  );
  const resumed = advance(game, 0, true);
  expect(resumed.flight / flightTime).toBe(lagFraction);
  const moving = advance(resumed, 0.16, true);
  expect(moving.keeper.x).toBeCloseTo(0.85 - 0.62 * 0.16);
  expect(advance(moving, flightTime, true).phase).toBe("goal");
  const blocked = kick(aimAt(createGame("hard"), 0.5), false);
  expect(advance(advance(blocked, 0, true), flightTime, true).phase).toBe(
    "saved",
  );
});

it("can lag and resume again after a connection flap", () => {
  const resumed = advance(kick(aimAt(createGame("hard"), 0.1), false), 0, true);
  const interrupted = advance(resumed, 0.2, false);
  expect(interrupted.phase).toBe("lagging");
  expect(interrupted.shotOnline).toBe(false);
  expect(advance(interrupted, 0.01, true).phase).toBe("flying");
});

it("uses the same offline lag, resume and reaction in every room while preserving the room", () => {
  for (const level of ["easy", "medium", "hard"] as const) {
    const shot = kick(
      aimAt({ ...createGame(level), keeper: { x: 0.65, y: 0.5 } }, 0.02),
      false,
    );
    expect(shot.phase).toBe("lagging");
    const loop = advance(shot, 0.3, false);
    expect(loop.keeper.x).toBe(0.65);
    const resumed = advance(loop, 0.16, true);
    expect(resumed.keeper.x).toBeCloseTo(0.65 - 0.62 * 0.16);
    expect(resumed.level).toBe(level);
    expect(advance(resumed, flightTime, true).phase).toBe("goal");
  }
});

it("preserves continuous horizontal aim, fixes height, and bounds keyboard aiming", () => {
  const first = aimAt(createGame("hard"), 0.2134);
  const second = aimAt(first, 0.2497);
  expect(first.aim).toEqual({ x: 0.2134, y: 0.5 });
  expect(second.aim).toEqual({ x: 0.2497, y: 0.5 });
  expect(second.keeper).toEqual(first.keeper);
  expect(aimAt(second, -0.02).aim).toEqual({ x: 0, y: 0.5 });
});
