import { expect, test } from "@playwright/test";

for (const externalAvailable of [true, false]) {
  test(`time machine uses external time first and server time only as fallback (external=${externalAvailable})`, async ({
    page,
  }) => {
    const externalUtc = Date.now();
    // The device clock must not replace the network reference.
    await page.addInitScript(() => {
      Date.now = () => Date.parse("2026-01-01T00:00:00Z");
    });
    const requests: string[] = [];
    page.on("request", (request) => {
      if (
        /^https:\/\/(utctime\.app|timeapi\.io)\//.test(request.url()) ||
        new URL(request.url()).pathname === "/api/time"
      )
        requests.push(request.url());
    });
    await page.route(/^https:\/\/(utctime\.app|timeapi\.io)\//, (route) =>
      route.fulfill({
        status: externalAvailable ? 200 : 503,
        headers: { "Access-Control-Allow-Origin": "*" },
        json: {
          unix_ms: externalUtc,
          timeZone: "Etc/UTC",
          dateTime: new Date(externalUtc).toISOString().replace(/Z$/, ""),
        },
      }),
    );
    const responsePromise = externalAvailable
      ? null
      : page.waitForResponse("**/api/time");
    await page.goto("/?locale=ja&stage=S-400");
    let utc = externalUtc;
    if (responsePromise) {
      const response = await responsePromise;
      expect(response.ok()).toBe(true);
      expect(response.headers()["cache-control"]).toBe("no-store");
      utc = (await response.json()).unix_ms;
      expect(Math.abs(utc - Date.now())).toBeLessThan(10_000);
    }
    await expect(
      page.getByRole("heading", { name: /タイムマシン/ }),
    ).toBeVisible();
    const clock = page.locator(".analog-clock");
    await expect(clock).toHaveAttribute("data-ready", "true");
    await expect(clock).toHaveAttribute("datetime", /^\d{4}-/);
    const target = Date.parse((await clock.getAttribute("datetime")) ?? "");
    expect(Math.abs(target - (utc - 3_600_000))).toBeLessThan(5000);
    await expect(
      page.getByText("時刻を確認しています。", { exact: true }),
    ).toHaveCount(0);
    expect(requests).toHaveLength(externalAvailable ? 1 : 3);
    expect(requests[0]).toMatch(/^https:\/\/(utctime\.app|timeapi\.io)\//);
    if (!externalAvailable) {
      expect(requests[1]).toMatch(/^https:\/\/(utctime\.app|timeapi\.io)\//);
      expect(requests[2]).toMatch(/\/api\/time$/);
    }
  });
}
