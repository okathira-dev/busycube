import { createLinks, roots, textDirective, words } from "./graph";
import excerpt from "./hyperlink-excerpt.json";

describe("word-occurrence hyperlink puzzle", () => {
  it("keeps commas and periods outside words while preserving the article", () => {
    for (const word of words) expect(word.text).not.toMatch(/[,.]/);
    expect(
      excerpt.paragraphs.map((_, index) =>
        words
          .filter((word) => word.paragraphIndex === index)
          .map((word) => word.text + word.punctuation)
          .join(" "),
      ),
    ).toEqual(excerpt.paragraphs);
    expect(textDirective(roots[1])).toContain(",graph,-%2C%20formed");
  });
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
  it("encodes reserved characters in every text-fragment term", () => {
    for (const [index, word] of words.entries()) {
      const directive = textDirective(index).split(":~:text=")[1] ?? "";
      const terms = directive.split(",");
      if (terms[0]?.endsWith("-")) terms[0] = terms[0].slice(0, -1);
      const last = terms.length - 1;
      if (terms[last]?.startsWith("-")) terms[last] = terms[last].slice(1);
      for (const term of terms) expect(term).not.toMatch(/[-&,]/);
      expect(terms.map(decodeURIComponent)).toContain(word.text);
    }
    for (const index of [4, 5]) {
      expect(textDirective(index)).toContain("Berners%2DLee");
    }
  });
});
