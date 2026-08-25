import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("S-740 product background fixture", () => {
  it("requires a real clientless periodicsync and ships the fixed bloom flag", async () => {
    const worker = await readFile(
      resolve(process.cwd(), "public/periodic/periodic-sync-sw.js"),
      "utf8",
    );
    const bloom = await readFile(
      resolve(process.cwd(), "public/periodic/bloom.svg"),
      "utf8",
    );
    expect(worker).toContain('self.addEventListener("periodicsync"');
    expect(worker).toContain("self.clients.matchAll");
    expect(worker).toContain("windows.length !== 0");
    expect(worker).not.toMatch(/setTimeout|showNotification/u);
    expect(bloom).toContain("busycube{background_bloom}");
  });
});
