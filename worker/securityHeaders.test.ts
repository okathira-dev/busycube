import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { securityHeaders } from "./securityHeaders";

describe("security headers", () => {
  it("keeps Cloudflare Static Assets headers aligned with Worker responses", async () => {
    const staticHeaders = await readFile(
      resolve(import.meta.dirname, "../public/_headers"),
      "utf8",
    );

    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(staticHeaders).toContain(`  ${name}: ${value}\n`);
    }
  });
});
