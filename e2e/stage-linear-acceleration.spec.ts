import { expect, test } from "@playwright/test";

test("uses native LinearAccelerationSensor readings for both 50 thresholds on each axis", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["accelerometer"]);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setSensorOverrideEnabled", {
    enabled: true,
    type: "linear-acceleration",
  });
  await cdp.send("Emulation.setSensorOverrideReadings", {
    type: "linear-acceleration",
    reading: { xyz: { x: 0, y: 0, z: 0 } },
  });
  await page.addInitScript(() => {
    const Native = LinearAccelerationSensor;
    const instances: LinearAccelerationSensor[] = [];
    Reflect.set(window, "observedLinearSensors", instances);
    Reflect.set(
      window,
      "LinearAccelerationSensor",
      class extends Native {
        constructor(options?: SensorOptions) {
          super(options);
          instances.push(this);
        }
      },
    );
  });
  await page.goto("/?locale=en&stage=S-530");
  const boxes = page.locator(".s530-axis .gift-box");
  await expect(boxes).toHaveCount(3);
  await page.getByRole("button", { name: /^Horizontal arrows:/ }).click();
  await expect(page.getByRole("status")).toHaveText("Running");
  const diagram = (axis: string) =>
    page.locator(`.s530-diagram[data-axis="${axis}"]`);
  async function sample(axis: "x" | "y" | "z", value: number) {
    await cdp.send("Emulation.setSensorOverrideReadings", {
      type: "linear-acceleration",
      reading: { xyz: { x: 0, y: 0, z: 0, [axis]: value } },
    });
  }
  await sample("x", 49.9);
  await expect
    .poll(async () =>
      Number(
        await diagram("x")
          .locator('[data-direction="positive"]')
          .getAttribute("stroke-width"),
      ),
    )
    .toBeGreaterThan(4.9);
  await expect(
    diagram("x").locator('[data-direction="positive"]'),
  ).toHaveAttribute("data-reached", "false");
  await sample("x", 50);
  await expect(
    diagram("x").locator('[data-direction="positive"]'),
  ).toHaveAttribute("data-reached", "true");
  await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
  await sample("x", -49.9);
  await expect
    .poll(async () =>
      Number(
        await diagram("x")
          .locator('[data-direction="negative"]')
          .getAttribute("stroke-width"),
      ),
    )
    .toBeGreaterThan(4.9);
  await expect(
    diagram("x").locator('[data-direction="negative"]'),
  ).toHaveAttribute("data-reached", "false");
  await sample("x", -50);
  await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
  await expect(boxes.nth(1)).not.toHaveAttribute("data-box-state", "open");
  for (const [index, axis] of (["y", "z"] as const).entries()) {
    await sample(axis, -50);
    await expect(
      diagram(axis).locator('[data-direction="negative"]'),
    ).toHaveAttribute("data-reached", "true");
    await expect(boxes.nth(index + 1)).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
    await sample(axis, 50);
    await expect(boxes.nth(index + 1)).toHaveAttribute(
      "data-box-state",
      "open",
    );
  }
  await page.screenshot({
    path: testInfo.outputPath("linear-acceleration-axes.png"),
  });
  await page.getByRole("button", { name: /Next stage/ }).click();
  await expect(page.locator(".s530-axes")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          Reflect.get(
            window,
            "observedLinearSensors",
          ) as LinearAccelerationSensor[]
        ).every((sensor) => !sensor.activated),
      ),
    )
    .toBe(true);
  await cdp.send("Emulation.setSensorOverrideEnabled", {
    enabled: false,
    type: "linear-acceleration",
  });
});
