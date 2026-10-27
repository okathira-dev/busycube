import { createLinks, roots, textDirective, words } from "./graph";

describe("word-occurrence hyperlink puzzle", () => {
  it("gives every occurrence an edge and only the agreed two-word cycle", () => {
    expect(words).toHaveLength(174);
    for (let round = 0; round < 30; round++) {
      const links = createLinks();
      expect(links[roots[0]]).toBe(roots[1]);
      expect(links[roots[1]]).toBe(roots[0]);
      for (let i = 0; i < words.length; i++) {
        let current = i;
        for (let step = 0; step < 6 && !roots.includes(current); step++)
          current = links[current] ?? -1;
        expect(roots).toContain(current);
      }
      for (const terminal of roots) {
        let layer = [terminal];
        for (const count of [1, 1, 4, 16, 64]) {
          layer = links.flatMap((parent, child) =>
            !roots.includes(child) && layer.includes(parent) ? [child] : [],
          );
          expect(layer).toHaveLength(count);
        }
      }
    }
  });
  it("changes assignments between entries but distinguishes repeated word occurrences", () => {
    expect(createLinks(() => 0)).not.toEqual(createLinks(() => 0.9));
    expect(new Set(words.map((_, i) => textDirective(i))).size).toBe(
      words.length,
    );
    const graph = textDirective(roots[1]);
    expect(graph).toContain("Webgraph");
    expect(graph).toContain("formed");
  });
});
