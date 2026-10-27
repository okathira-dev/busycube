import { expect, test } from "@playwright/test";

test("uses native signed Gyroscope integration, cancels oscillation, and opens each full-turn box", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["gyroscope"]);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setSensorOverrideEnabled", {
    enabled: true,
    type: "gyroscope",
  });
  async function sample(x: number, y = 0, z = 0) {
    await cdp.send("Emulation.setSensorOverrideReadings", {
      type: "gyroscope",
      reading: { xyz: { x, y, z } },
    });
  }
  async function stream(x: number, y = 0, z = 0, count = 20) {
    for (let i = 0; i < count; i++) {
      await sample(x, y, z);
      await page.waitForTimeout(20);
    }
  }
  await sample(0);
  await page.addInitScript(() => {
    const Native = Gyroscope;
    const instances: Gyroscope[] = [];
    Reflect.set(window, "observedGyroscopes", instances);
    Reflect.set(
      window,
      "Gyroscope",
      class extends Native {
        constructor(options?: SensorOptions) {
          super(options);
          instances.push(this);
        }
      },
    );
  });
  await page.goto("/?locale=en&stage=S-560");
  const boxes = page.locator(".s560-axis .gift-box");
  await expect(boxes).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Start sensor" })).toHaveCount(
    0,
  );
  await boxes.nth(0).click();
  await expect(page.getByRole("status")).toHaveText("Running");
  // More than one turn of total travel, but the signed forward/backward parts cancel.
  for (let i = 0; i < 4; i++) {
    await stream(4);
    await stream(-4);
  }
  await sample(0);
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  const ring = page.locator('.s560-diagram[data-axis="x"] .s560-progress');
  const circumference = Number(await ring.getAttribute("stroke-dasharray"));
  expect(
    Number(await ring.getAttribute("stroke-dashoffset")) / circumference,
  ).toBeGreaterThan(0.8);
  for (const [index, xyz] of [
    [10, 0, 0],
    [0, -10, 0],
    [0, 0, 10],
  ].entries()) {
    await stream(xyz[0] ?? 0, xyz[1] ?? 0, xyz[2] ?? 0, 40);
    await expect(boxes.nth(index)).toHaveAttribute("data-box-state", "open");
    if (index < 2)
      await expect(boxes.nth(index + 1)).not.toHaveAttribute(
        "data-box-state",
        "open",
      );
  }
  await sample(0);
  await page.screenshot({
    path: testInfo.outputPath("gyroscope-full-turns.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Next stage/ }).click();
  await expect(page.locator(".s560-axes")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (Reflect.get(window, "observedGyroscopes") as Gyroscope[]).every(
          (sensor) => !sensor.activated,
        ),
      ),
    )
    .toBe(true);
  await cdp.send("Emulation.setSensorOverrideEnabled", {
    enabled: false,
    type: "gyroscope",
  });
});
