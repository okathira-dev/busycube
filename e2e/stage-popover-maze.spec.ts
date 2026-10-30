import { expect, test } from "@playwright/test";

test("keeps all three actual popover routes after replacing instructions with graphics", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-920");
  const frame = page.frameLocator(".s920-frame");
  const start = frame.getByRole("button", { name: "Open maze", exact: true });
  await expect(start).toBeEnabled();
  expect(
    await start
      .locator("svg")
      .evaluate((node) => node.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(32);
  await expect(
    page.getByText("OUTSIDE DISPLAY AREA", { exact: true }),
  ).toHaveCount(0);
  const routes = [
    {
      goal: "amber",
      directions: ["right", "right", "up", "right", "right", "down", "right"],
    },
    { goal: "cyan", directions: ["down", "left", "down", "down"] },
    {
      goal: "violet",
      directions: ["left", "up", "left", "up", "left", "down"],
    },
  ];
  for (const route of routes) {
    await start.click();
    let current = "s920-root";
    for (const direction of route.directions) {
      const door = frame.locator(
        `#${current} > .s920-popover__room > .s920-popover__doors > button[data-direction="${direction}"]:not([popovertarget*="-dead-"])`,
      );
      const next = await door.getAttribute("popovertarget");
      if (!next) throw new Error("Missing native popover target");
      await door.click();
      await expect(frame.locator(`#${next}`)).toBeVisible();
      current = next;
    }
    expect(current).toBe(`s920-goal-${route.goal}`);
    const goal = frame.locator(`#${current}`);
    expect(await goal.evaluate((node) => node.matches(":popover-open"))).toBe(
      true,
    );
    const geometry = await goal.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: node.ownerDocument.defaultView?.innerWidth ?? 0,
        height: node.ownerDocument.defaultView?.innerHeight ?? 0,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.top).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 1);
    await goal.getByRole("button", { name: /Route:/ }).click();
    await expect(goal.locator(".gift-box")).toHaveAttribute(
      "data-box-state",
      "open",
    );
    await page.screenshot({
      path: testInfo.outputPath(`${route.goal}-maze.png`),
      fullPage: true,
    });
    while (await frame.locator(":popover-open").count())
      await page.keyboard.press("Escape");
  }
});

test("reports frame stylesheet preparation failure separately from unsupported APIs", async ({
  page,
}) => {
  await page.route("**/s920-test-missing.css", (route) =>
    route.fulfill({ status: 503, contentType: "text/css", body: "" }),
  );
  await page.goto("/?locale=en&stage=S-920");
  await expect(
    page
      .frameLocator(".s920-frame")
      .getByRole("button", { name: "Open maze", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/s920-test-missing.css";
    document.head.append(stylesheet);
    const frame = document.querySelector<HTMLIFrameElement>(".s920-frame");
    if (!frame?.contentWindow) throw new Error("Missing frame");
    frame.contentWindow.location.reload();
  });
  await expect(
    page.getByText("Maze display preparation failed.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("This maze needs Popover and Anchor Positioning.", {
      exact: true,
    }),
  ).toHaveCount(0);
});
