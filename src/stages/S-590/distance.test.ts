import {
  conservativeDistance,
  distanceRadius,
  radii,
  storedAnchor,
  thresholds,
} from "./distance";

it("subtracts both accuracies from displacement instead of summing a travelled path", () => {
  const start = { latitude: 0, longitude: 0, accuracy: 2 };
  const fix = {
    latitude: ((20 / 6371000) * 180) / Math.PI,
    longitude: 0,
    accuracy: 3,
  };
  expect(conservativeDistance(start, fix)).toBeCloseTo(15, 8);
  expect(conservativeDistance(start, start)).toBe(0);
  expect(conservativeDistance(start, { ...fix, accuracy: 30 })).toBe(0);
  expect(conservativeDistance(start, { ...fix, latitude: 91 })).toBeNull();
  expect(conservativeDistance(start, { ...fix, accuracy: NaN })).toBeNull();
  expect(conservativeDistance(start, { ...fix, accuracy: -1 })).toBeNull();
  expect(
    conservativeDistance(start, { ...fix, longitude: Infinity }),
  ).toBeNull();
});

it("maps every solve boundary to its ring, with a bounded outward overflow", () => {
  expect(distanceRadius(0)).toBe(0);
  thresholds.forEach((threshold, i) => {
    expect(distanceRadius(threshold)).toBe(radii[i]);
    expect(distanceRadius(threshold - 0.001)).toBeLessThan(radii[i] ?? 0);
    expect(distanceRadius(threshold + 0.001)).toBeGreaterThan(radii[i] ?? 0);
  });
  expect(distanceRadius(10000)).toBe(280);
});

it("reuses only valid, nonfuture anchors younger than 24 hours", () => {
  const anchor = { latitude: 35, longitude: 139, accuracy: 1, at: 1000 };
  expect(storedAnchor(JSON.stringify(anchor), 1001)).toEqual(anchor);
  for (const value of [
    null,
    "bad",
    {},
    { ...anchor, latitude: 100 },
    { ...anchor, accuracy: -1 },
    { ...anchor, at: 2000 },
  ]) {
    expect(
      storedAnchor(
        typeof value === "string" ? value : JSON.stringify(value),
        1001,
      ),
    ).toBeNull();
  }
  expect(storedAnchor(JSON.stringify(anchor), 86_401_000)).toBeNull();
});
