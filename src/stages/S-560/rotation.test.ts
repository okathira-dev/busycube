import {
  completesTurn,
  fullTurn,
  initialRotation,
  observeRotation,
} from "./rotation";

it("integrates signed rates by sensor time and accepts either complete turn", () => {
  for (const direction of [-1, 1]) {
    let state = observeRotation(initialRotation(), direction * fullTurn, 0);
    expect(completesTurn(state.angle)).toBe(false);
    for (let i = 1; i <= 4; i++) {
      state = observeRotation(state, direction * fullTurn, i * 250);
      expect(completesTurn(state.angle)).toBe(i === 4);
    }
    expect(state.angle).toBe(direction * fullTurn);
  }
});

it("cancels reverse rotation instead of accumulating oscillation distance", () => {
  let state = observeRotation(initialRotation(), fullTurn, 0);
  for (let i = 1; i <= 40; i++) {
    state = observeRotation(state, i % 2 ? -fullTurn : fullTurn, i * 100);
    expect(state.angle).toBe(0);
    expect(completesTurn(state.angle)).toBe(false);
  }
});

it("does not bridge missing, stale, or long interrupted observations", () => {
  let state = observeRotation(initialRotation(), 2, 100);
  state = observeRotation(state, 2, 200);
  expect(state.angle).toBe(0.2);
  expect(observeRotation(state, 100, 200)).toBe(state);
  expect(observeRotation(state, 100, 199)).toBe(state);
  expect(observeRotation(state, 100, 451).angle).toBe(0.2);
  for (const invalid of [null, NaN, Infinity, -Infinity]) {
    const missing = observeRotation(state, invalid, 210);
    expect(missing.previous).toBeNull();
    expect(observeRotation(missing, 100, 220).angle).toBe(0.2);
    expect(observeRotation(state, 100, invalid).previous).toBeNull();
  }
  expect(observeRotation(state, 100, -1).previous).toBeNull();
  const huge = observeRotation(initialRotation(), Number.MAX_VALUE, 0);
  expect(
    observeRotation({ ...huge, angle: Number.MAX_VALUE }, Number.MAX_VALUE, 250)
      .previous,
  ).toBeNull();
});
