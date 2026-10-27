import excerpt from "./hyperlink-excerpt.json";

export const words = excerpt.paragraphs.flatMap((paragraph, paragraphIndex) =>
  paragraph.split(/\s+/).map((text, occurrence) => ({
    text,
    paragraphIndex,
    id: `${paragraphIndex}:${occurrence}`,
  })),
);
const root = (word: string) =>
  words.findIndex(
    ({ text }) => text.replace(/[^a-z]/gi, "").toLowerCase() === word,
  );
export const roots = [root("directed"), root("graph")] as const;

export function createLinks(random = Math.random): number[] {
  const remaining = words.map((_, i) => i).filter((i) => !roots.includes(i));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [remaining[i], remaining[j]] = [
      remaining[j] as number,
      remaining[i] as number,
    ];
  }
  const links = words.map(() => -1);
  links[roots[0]] = roots[1];
  links[roots[1]] = roots[0];
  for (const terminal of roots) {
    let parents: number[] = [terminal];
    for (const multiplier of [1, 1, 4, 4, 4]) {
      const children: number[] = [];
      for (const parent of parents) {
        for (let i = 0; i < multiplier; i++) {
          const child = remaining.pop();
          if (child === undefined)
            throw new Error("Incomplete hyperlink layer");
          links[child] = parent;
          children.push(child);
        }
      }
      parents = children;
    }
  }
  if (remaining.length) throw new Error("Unassigned hyperlink words");
  return links;
}

export function textDirective(index: number): string {
  const target = words[index];
  if (!target) throw new Error("Unknown word occurrence");
  const context = (start: number, end: number) =>
    words
      .slice(start, end)
      .filter((w) => w.paragraphIndex === target.paragraphIndex)
      .map((w) => w.text)
      .join(" ");
  const before = context(Math.max(0, index - 6), index);
  const after = context(index + 1, index + 7);
  return `#s690-word-${index}:~:text=${before ? `${encodeURIComponent(before)}-,` : ""}${encodeURIComponent(target.text)}${after ? `,-${encodeURIComponent(after)}` : ""}`;
}
