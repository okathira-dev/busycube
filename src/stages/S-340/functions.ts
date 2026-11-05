export function randomIndex(limit: number): number {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  if (value === undefined) throw new Error("Random source unavailable");
  return value % limit;
}

export function shuffleAllPositions(
  previous: readonly number[],
  random = randomIndex,
): number[] {
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const next = [...previous];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = random(i + 1);
      const value = next[i];
      const other = next[j];
      if (value === undefined || other === undefined)
        throw new Error("Invalid shuffle index");
      next[i] = other;
      next[j] = value;
    }
    if (next.every((position, index) => position !== previous[index]))
      return next;
  }
  const offset = 1 + random(previous.length - 1);
  return previous.map(
    (_, index) => previous[(index + offset) % previous.length] ?? 0,
  );
}
