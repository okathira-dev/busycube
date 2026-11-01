import { isPendingShot } from "./pending";

it("restores only a valid room, opponent and bounded horizontal shot; never a legacy receipt", () => {
  const pending = {
    level: "hard",
    opponent: "sora_0001",
    aim: { x: 0.12, y: 0.5 },
    keeper: { x: 0.88, y: 0.5 },
  };
  expect(isPendingShot(pending)).toBe(true);
  for (const change of [
    { level: "other" },
    { opponent: "sora" },
    { aim: { x: Number.NaN, y: 0.5 } },
    { aim: { x: 1.1, y: 0.5 } },
    { aim: { x: 0.12, y: 0.23 } },
    { keeper: { x: -0.1, y: 0.5 } },
  ])
    expect(isPendingShot({ ...pending, ...change })).toBe(false);
  expect(isPendingShot({ shot: pending })).toBe(false);
  expect(isPendingShot(null)).toBe(false);
});
