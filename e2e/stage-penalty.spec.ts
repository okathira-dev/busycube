import { expect, type Page, test } from "@playwright/test";

// Ghosting works without a controlling worker or a network receipt.
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    expect(new URL(request.url()).pathname).not.toBe("/penalty/receipt");
  });
});

async function aim(page: Page, x: number, y = 0.5, touch = false) {
  const goal = page.locator(".pk-target");
  const bounds = await goal.boundingBox();
  if (!bounds) throw new Error("Goal is not visible");
  const position = { x: bounds.width * x, y: bounds.height * y };
  if (touch) await goal.tap({ position });
  else await goal.click({ position });
}

test("rating rooms replace opponents and the matching sub account leaves with room 2000", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-980");
  const name = () => page.locator(".pk-match strong").innerText();
  await expect(
    page.getByRole("heading", { name: "Ghosting", exact: true }),
  ).toBeVisible();
  const first = await name();
  expect(first).toMatch(/^[a-z]+_\d{4}$/);
  await expect(page.locator(".pk-levels button")).toHaveText([
    "1000",
    "1500",
    "2000",
  ]);
  await page.getByRole("button", { name: "1500", exact: true }).click();
  const second = await name();
  expect(second).toMatch(/^[a-z]+_\d{4}$/);
  expect(second).not.toBe(first);
  await page.getByRole("button", { name: "2000", exact: true }).click();
  const third = await name();
  expect([first, second]).not.toContain(third);
  await expect(page.locator(".pk-comments")).toContainText(
    `${third}_sub joined the stream`,
  );
  await expect(page.locator(".pk-viewer-count")).toHaveText("2");
  await page.getByRole("button", { name: "Kick", exact: true }).click();
  await expect(page.locator(".pk-score")).toHaveText("SAVED!");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  expect(await name()).toBe(third);
  await page.getByRole("button", { name: "1000", exact: true }).click();
  expect([first, second, third]).not.toContain(await name());
  await expect(page.locator(".pk-viewer-count")).toHaveText("1");
  await expect(page.locator(".pk-comments")).toContainText(
    `${third}_sub left the stream`,
  );
  await page.getByRole("button", { name: "2000", exact: true }).click();
  const next = await name();
  expect(next).not.toBe(third);
  await expect(page.locator(".pk-comments")).toContainText(
    `${next}_sub joined the stream`,
  );
});

for (const rating of ["1000", "1500"] as const) {
  test(`room ${rating} uses real offline lag and local resume without awarding the box`, async ({
    page,
    context,
  }, info) => {
    await page.goto("/?locale=en&stage=S-980");
    await page.getByRole("button", { name: rating, exact: true }).click();
    const opponent = await page.locator(".pk-match strong").innerText();

    await expect
      .poll(
        () =>
          page
            .locator(".pk-keeper")
            .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
        { intervals: [30] },
      )
      .toBeGreaterThan(65);
    await context.setOffline(true);
    await aim(page, 0.02);
    await page.getByRole("button", { name: "Kick", exact: true }).click();
    await expect(page.locator(".pk-pitch")).toHaveAttribute(
      "data-result",
      "lagging",
    );
    await expect(page.locator(".pk-controls button")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Waiting…", exact: true }),
    ).toBeDisabled();
    if (rating === "1500") {
      // Leave while offline, then restore the locally saved room and shot.
      await page
        .getByRole("button", { name: "Back to boxes", exact: true })
        .click();
      await expect(page.locator(".pk-stage")).toHaveCount(0);
    }
    await context.setOffline(false);
    if (rating === "1500") await page.goto("/?locale=en&stage=S-980");
    await expect(page.locator(".pk-score")).toHaveText("GOAL!");
    await expect(page.locator(".pk-levels [aria-pressed='true']")).toHaveText(
      new RegExp(`^${rating}`),
    );
    await expect(page.locator(".pk-match strong")).toHaveText(opponent);
    await expect(page.locator(".pk-viewer-count")).toHaveText("1");
    await expect(page.locator(".problem-gift .gift-box")).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
    await page.screenshot({
      path: info.outputPath(`pk-${rating}-offline-goal.png`),
      fullPage: true,
    });
  });
}

test("advanced moves rapidly toward the aim instead of teleporting", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-01T00:00:00Z") });
  await page.goto("/?locale=en&stage=S-980");
  await expect(page.locator(".pk-pitch")).toBeVisible();
  await page.clock.pauseAt(new Date("2026-11-01T01:00:00Z"));
  await page.getByRole("button", { name: "2000", exact: true }).click();
  const position = () =>
    page
      .locator(".pk-keeper")
      .evaluate((node) => parseFloat((node as HTMLElement).style.left));
  await aim(page, 0.12);
  expect(await position()).toBe(50);
  await page.clock.runFor(16);
  expect(await position()).toBeGreaterThan(12);
  expect(await position()).toBeLessThan(50);
  await page.clock.runFor(200);
  expect(await position()).toBeCloseTo(12, 0);
});

test("aim follows arbitrary horizontal taps, ignores height, and the ball reaches that point", async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date("2026-11-01T00:00:00Z") });
  await page.goto("/?locale=en&stage=S-980");
  await expect(page.locator(".pk-target")).toHaveCount(1);
  await page.clock.pauseAt(new Date("2026-11-01T01:00:00Z"));
  const readAim = () =>
    page.locator(".pk-aim").evaluate((node) => ({
      x: parseFloat((node as HTMLElement).style.left) / 100,
      y: parseFloat((node as HTMLElement).style.top) / 100,
    }));
  const bounds = await page.locator(".pk-target").boundingBox();
  if (!bounds) throw new Error("Goal is not visible");
  for (const point of [
    { x: 0.21, y: 0.23 },
    { x: 0.24, y: 0.72 },
    { x: 0.24, y: 0.18 },
    { x: 0.67, y: 0.38 },
  ]) {
    await aim(page, point.x, point.y);
    const marker = await readAim();
    // Mouse click coordinates round to device pixels; verify the marker within
    // a pixel-sized tolerance rather than rounding its normalized game value.
    expect(Math.abs(marker.x - point.x) * bounds.width).toBeLessThanOrEqual(
      1.5,
    );
    expect(marker.y).toBe(0.5);
  }
  const before = await readAim();
  await page.locator(".pk-target").press("ArrowLeft");
  await page.locator(".pk-target").press("ArrowUp");
  await page.locator(".pk-target").press("ArrowDown");
  const after = await readAim();
  expect(after.x).toBeCloseTo(before.x - 0.02, 4);
  expect(after.y).toBe(0.5);
  await page.screenshot({
    path: info.outputPath("pk-free-aim.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Kick", exact: true }).click();
  await page.clock.runFor(600);
  const ball = await page.locator(".pk-ball").evaluate((node) => ({
    x: parseFloat((node as HTMLElement).style.left),
    y: parseFloat((node as HTMLElement).style.top),
  }));
  expect(ball.x).toBeCloseTo(10 + after.x * 80, 3);
  expect(ball.y).toBeCloseTo(18 + after.y * 27, 3);
});

test.describe("touch PK", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("taps an aim and kicks visibly, then retries without awarding a practice box", async ({
    page,
  }, info) => {
    await page.goto("/?locale=ja&stage=S-980");
    await expect(
      page.getByRole("region", { name: "ゲーム内配信", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("ShowLobby", { exact: true })).toBeVisible();
    await expect(page.locator(".pk-pitch .pk-sdk")).toBeVisible();
    await page.getByRole("button", { name: /^1500(?: ✓)?$/ }).tap();
    await aim(page, 0.82, 0.5, true);
    await expect
      .poll(
        () =>
          page
            .locator(".pk-keeper")
            .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
        { intervals: [30] },
      )
      .toBeGreaterThan(65);
    await aim(page, 0.02, 0.28, true);
    expect(
      await page
        .locator(".pk-aim")
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    ).toBeCloseTo(2, 0);
    await page.getByRole("button", { name: "蹴る", exact: true }).tap();
    await expect(page.locator(".pk-pitch")).toHaveAttribute(
      "data-shooting",
      "true",
    );
    await expect(page.locator(".pk-score")).toHaveText("ゴール！");
    await expect(page.locator(".problem-gift .gift-box")).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("pk-touch-goal.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "もう一度", exact: true }).tap();
    await expect(
      page.getByRole("button", { name: "蹴る", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".pk-pitch")).toHaveAttribute(
      "data-result",
      "ready",
    );
  });
});

test("beginner and intermediate patrol; intermediate reacts only after the kick", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-11-01T00:00:00Z") });
  await page.goto("/?locale=en&stage=S-980");
  await expect(page.locator(".pk-pitch")).toBeVisible();
  await page.clock.pauseAt(new Date("2026-11-01T01:00:00Z"));
  const keeper = page.locator(".pk-keeper");
  const keeperPosition = () =>
    keeper.evaluate((node) => parseFloat((node as HTMLElement).style.left));
  const kick = page.getByRole("button", { name: "Kick", exact: true });
  const box = page.locator(".problem-gift .gift-box");

  await page.getByRole("button", { name: /^1000(?: ✓)?$/ }).click();
  await aim(page, 0.82);
  await page.clock.runFor(200);
  const outbound = await keeperPosition();
  expect(outbound).toBeGreaterThan(50);
  expect(outbound).toBeLessThan(70);
  await page.clock.runFor(1600);
  expect(await keeperPosition()).toBeLessThan(outbound);
  await page.getByRole("button", { name: /^1000(?: ✓)?$/ }).click();
  await aim(page, 0.18);
  await kick.click();
  await expect(page.locator(".pk-score")).toHaveText("SHOOT!");
  await page.clock.runFor(160);
  expect(await keeperPosition()).toBeGreaterThan(50);
  const ballTop = await page
    .locator(".pk-ball")
    .evaluate((node) => parseFloat((node as HTMLElement).style.top));
  expect(ballTop).toBeLessThan(78);
  expect(ballTop).toBeGreaterThan(33);
  await page.clock.runFor(440);
  await expect(page.locator(".pk-score")).toHaveText("GOAL!");
  await expect(box).not.toHaveAttribute("data-box-state", "open");

  await page.getByRole("button", { name: /^1500(?: ✓)?$/ }).click();
  await aim(page, 0.18);
  await page.clock.runFor(200);
  expect(await keeperPosition()).toBeGreaterThan(50);
  await page.clock.runFor(100);
  const patrol = await keeperPosition();
  expect(patrol).toBeGreaterThan(60);
  expect(patrol).toBeLessThan(69);
  await aim(page, patrol / 100);
  await kick.click();
  await page.clock.runFor(600);
  await expect(page.locator(".pk-score")).toHaveText("SAVED!");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await aim(page, 0.02);
  await page.clock.runFor(300);
  const beforeKick = await keeperPosition();
  expect(beforeKick).toBeGreaterThan(60);
  expect(beforeKick).toBeLessThan(69);
  await kick.click();
  await page.clock.runFor(160);
  expect(await keeperPosition()).toBeLessThan(beforeKick);
  expect(await keeperPosition()).toBeGreaterThan(2);
  await expect(page.locator(".pk-score")).toHaveText("SHOOT!");
  await page.clock.runFor(440);
  await expect(page.locator(".pk-score")).toHaveText("GOAL!");
  await expect(box).not.toHaveAttribute("data-box-state", "open");
});

test("all ratings must be won, including a resumed offline win at 2000", async ({
  page,
  context,
}, info) => {
  await page.goto("/?locale=en&stage=S-980");
  const box = page.locator(".problem-gift .gift-box");
  const kick = page.getByRole("button", { name: "Kick", exact: true });
  await page.getByRole("button", { name: "2000", exact: true }).click();
  const studio = page.getByRole("region", {
    name: "In-game stream",
    exact: true,
  });
  await expect(studio.locator(".pk-pitch")).toHaveCount(1);
  await expect(studio.locator(".pk-pitch .pk-sdk")).toContainText("ShowLobby");
  await expect(
    studio.locator(".pk-stream-header, .pk-stream-meta"),
  ).toHaveCount(0);
  await expect(page.locator(".pk-sight")).toHaveCount(0);
  const opponent = await studio.locator(".pk-match strong").innerText();
  expect(opponent).toMatch(/^[a-z]+_\d{4}$/);
  await expect(
    studio.getByRole("log", { name: "Comments", exact: true }),
  ).toContainText(`${opponent}_sub joined the stream`);
  await expect(studio.locator(".pk-viewer-count")).toHaveText("2");
  await expect(studio.locator(".pk-stream-status")).toHaveText("Live");
  for (const point of [
    { x: 0.18, y: 0.5 },
    { x: 0.23, y: 0.2 },
    { x: 0.82, y: 0.72 },
  ]) {
    await aim(page, point.x, point.y);
    await kick.click();
    await expect(page.locator(".pk-score")).toHaveText("SAVED!");
    await page.getByRole("button", { name: "Retry", exact: true }).click();
  }

  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.screenshot({ path: info.outputPath("pk-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".pk-pitch")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("pk-mobile.png"),
    fullPage: true,
  });
  await aim(page, 0.88);
  await expect
    .poll(() =>
      page
        .locator(".pk-keeper")
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    )
    .toBeGreaterThan(85);
  await context.setOffline(true);
  await expect(studio.locator(".pk-stream-status")).toHaveText("Reconnecting…");
  await expect(studio.locator(".pk-viewer-count")).toHaveText("—");
  await expect(
    studio.getByRole("log", { name: "Comments", exact: true }),
  ).toContainText(`${opponent}_sub joined the stream`);
  await kick.click();
  await expect(page.locator(".pk-pitch")).toHaveAttribute(
    "data-result",
    "lagging",
  );
  await expect(
    page.getByRole("button", { name: "Waiting…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Cancel shot", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".pk-cancel")).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.locator(".pk-score")).toHaveText("SAVED!");
  await expect(page.locator(".pk-levels button").nth(2)).toHaveText("2000");
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await aim(page, 0.88);
  await expect
    .poll(() =>
      page
        .locator(".pk-keeper")
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    )
    .toBeGreaterThan(85);
  await context.setOffline(true);
  await aim(page, 0.12, 0.23);
  await kick.click();
  await expect(page.locator(".pk-pitch")).toHaveAttribute(
    "data-result",
    "lagging",
  );
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  let reached = false;
  await expect
    .poll(
      async () => {
        const left = await page
          .locator(".pk-ball")
          .evaluate((node) => parseFloat((node as HTMLElement).style.left));
        const progress = (50 - left) / (50 - (10 + 0.12 * 80));
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThan(0.205);
        if (progress > 0.15) reached = true;
        return reached && progress < 0.05;
      },
      { intervals: [30], timeout: 4000 },
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath("pk-lagging.png"),
    fullPage: true,
  });
  await context.setOffline(false);
  await expect(page.locator(".pk-score")).toHaveText("GOAL!");
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await expect(page.locator(".pk-levels button").nth(2)).toHaveText("2000 ✓");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("pk-resumed-goal.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".pk-levels button").nth(2)).toHaveText("2000 ✓");
  for (const [index, rating] of ["1000", "1500"].entries()) {
    await page.getByRole("button", { name: rating, exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator(".pk-keeper")
          .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
      )
      .toBeGreaterThan(65);
    await aim(page, 0.02);
    await kick.click();
    await expect(page.locator(".pk-score")).toHaveText("GOAL!");
    await expect(page.locator(".pk-levels button").nth(index)).toHaveText(
      `${rating} ✓`,
    );
    if (index === 0)
      await expect(box).not.toHaveAttribute("data-box-state", "open");
  }
  await expect(box).toHaveAttribute("data-box-state", "open");
  await page.reload();
  await expect(box).toHaveAttribute("data-box-state", "closed");
  await expect(page.locator(".pk-score")).not.toHaveText("GOAL!");
});

test("ignores malformed pending state and legacy Beacon attempts", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-980");
  for (const value of [
    "broken",
    JSON.stringify({
      level: "hard",
      opponent: "sora_0001",
      aim: { x: 2, y: 0.5 },
      keeper: { x: 0.9, y: 0.5 },
    }),
    JSON.stringify({ shot: { stage: "S-980", version: 2 } }),
  ]) {
    await page.evaluate((pending) => {
      sessionStorage.setItem("busycube-ghosting-pending-v1", pending);
      sessionStorage.setItem("busycube-penalty-pending-v2", pending);
    }, value);
    await page.reload();
    await expect(page.locator(".pk-pitch")).toHaveAttribute(
      "data-result",
      "ready",
    );
    await expect(page.locator(".problem-gift .gift-box")).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
  }
});

test("departing a lagging shot stops the game; returning restores the same opponent and resumes", async ({
  page,
  context,
}) => {
  await page.goto("/?locale=en&stage=S-980");
  await page.getByRole("button", { name: "2000", exact: true }).click();
  const opponent = await page.locator(".pk-match strong").innerText();
  await aim(page, 0.88);
  await expect
    .poll(() =>
      page
        .locator(".pk-keeper")
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    )
    .toBeGreaterThan(85);
  await context.setOffline(true);
  await aim(page, 0.12);
  await page.getByRole("button", { name: "Kick", exact: true }).click();
  await expect(page.locator(".pk-pitch")).toHaveAttribute(
    "data-result",
    "lagging",
  );
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect(page.locator(".pk-stage")).toHaveCount(0);
  await context.setOffline(false);
  // Give a leaked animation loop enough time to complete the shot.
  await page.waitForTimeout(750);
  const solved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("busycube-player-v2", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const ids = await new Promise<string[]>((resolve, reject) => {
      const r = db.transaction("state").objectStore("state").get("current");
      r.onsuccess = () =>
        resolve(r.result?.stages?.["S-980"]?.solvedBoxIds ?? []);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return ids;
  });
  expect(solved).not.toContain("B01");
  await page.goto("/?locale=en&stage=S-980");
  await expect(page.locator(".pk-match strong")).toHaveText(opponent);
  await expect(page.locator(".pk-score")).toHaveText("GOAL!");
  await expect(page.locator(".problem-gift .gift-box")).not.toHaveAttribute(
    "data-box-state",
    "open",
  );
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("busycube-ghosting-pending-v1"),
    ),
  ).toBeNull();
});

test("same-page offline play needs neither Beacon nor session storage", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "sendBeacon", { value: undefined });
    Object.defineProperty(window, "sessionStorage", {
      get: () => {
        throw new DOMException("Denied", "SecurityError");
      },
    });
  });
  await page.goto("/?locale=en&stage=S-980");
  await page.getByRole("button", { name: "2000", exact: true }).click();
  await aim(page, 0.88);
  await expect
    .poll(() =>
      page
        .locator(".pk-keeper")
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    )
    .toBeGreaterThan(85);
  await context.setOffline(true);
  await aim(page, 0.12);
  await page.getByRole("button", { name: "Kick", exact: true }).click();
  await expect(page.locator(".pk-score")).toHaveText("LAG");
  await context.setOffline(false);
  await expect(page.locator(".pk-score")).toHaveText("GOAL!");
  await expect(page.locator(".problem-gift .gift-box")).not.toHaveAttribute(
    "data-box-state",
    "open",
  );
});
