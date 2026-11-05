import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { evaluateImageDrop } from "./nativeImageDrop";
import fixtures from "./stage-drag-contract.json";

it.each(["page", "file", "window"] as const)(
  "matches the shipped %s diagram bytes with its real-resource URL",
  (image) => {
    const fixture = fixtures[image];
    const bytes = readFileSync(
      new URL(`../../public/${fixture.filename}`, import.meta.url),
    );
    const digest = createHash("sha256").update(bytes).digest("hex");
    expect(digest).toBe(fixture.sha256);
    const base = "https://example.test/game/";
    const uri = new URL(fixture.filename, base).href;
    const matches = evaluateImageDrop(uri, digest, base, fixtures);
    expect(
      matches.filter((check) => check.accepted).map((check) => check.image),
    ).toEqual([image]);
    expect(
      evaluateImageDrop("", digest, base, fixtures).some(
        (check) => check.accepted,
      ),
    ).toBe(false);
    expect(
      evaluateImageDrop(uri, undefined, base, fixtures).some(
        (check) => check.accepted,
      ),
    ).toBe(false);
  },
);
