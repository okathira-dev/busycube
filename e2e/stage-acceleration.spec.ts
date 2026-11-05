import { expect, test } from "@playwright/test";

test("opens on the first native low Accelerometer reading and maps its magnitude to the target", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["accelerometer"]);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setSensorOverrideEnabled", {
    enabled: true,
    type: "accelerometer",
  });
  async function sample(z: number) {
    await cdp.send("Emulation.setSensorOverrideReadings", {
      type: "accelerometer",
      reading: { xyz: { x: 0, y: 0, z } },
    });
  }
  await sample(9.8);
  await page.addInitScript(() => {
    const Native = Accelerometer;
    Reflect.set(window, "lowAccelerationReadings", 0);
    Reflect.set(
      window,
      "Accelerometer",
      class extends Native {
        constructor(options?: SensorOptions) {
          super(options);
          this.addEventListener("reading", () => {
            if (this.x === null || this.y === null || this.z === null) return;
            if (Math.hypot(this.x, this.y, this.z) <= 2) {
              Reflect.set(
                window,
                "lowAccelerationReadings",
                Reflect.get(window, "lowAccelerationReadings") + 1,
              );
              // Stop after this native event: a three-reading or 80 ms gate cannot pass.
              setTimeout(() => this.stop(), 0);
            }
          });
        }
      },
    );
  });
  await page.goto("/?locale=en&stage=S-550");
  const phone = page.locator(".s550-phone");
  const box = page.locator(".gift-box");
  await expect(phone).toHaveAttribute("data-observed", "false");
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.getByRole("button", { name: "Start sensor" }).click();
  await expect(phone).toHaveAttribute("data-observed", "true");
  await expect(phone).toHaveAttribute(
    "transform",
    "translate(120 337.20000000000005)",
  );
  await sample(2.1);
  await expect(phone).toHaveAttribute("transform", "translate(120 229.4)");
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.screenshot({
    path: testInfo.outputPath("acceleration-near-target.png"),
    fullPage: true,
  });
  await sample(2);
  await expect(box).toHaveAttribute("data-box-state", "open");
  await expect(phone).toHaveAttribute("transform", "translate(120 228)");
  expect(
    await page.evaluate(() => Reflect.get(window, "lowAccelerationReadings")),
  ).toBe(1);
  await cdp.send("Emulation.setSensorOverrideEnabled", {
    enabled: false,
    type: "accelerometer",
  });
});
