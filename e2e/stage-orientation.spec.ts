import { expect, test } from "@playwright/test";
import { Euler, MathUtils } from "three";
import {
  deviceRotation,
  initialPhoneRotation,
} from "../src/stages/S-100/orientation";

test("cancels the preset from a relative sensor baseline and holds a real emulated orientation", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions([
    "accelerometer",
    "gyroscope",
    "magnetometer",
  ]);
  await page.goto("/?locale=en&stage=S-100");
  const phone = page.locator(".s100-phone");
  await expect(phone).toBeVisible();
  await expect(page.locator(".s100-stage .measurement")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("tilted-phone.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Screen rotation:/ }).click();
  const sensors = await context.newCDPSession(page);
  const initial = { alpha: 103, beta: -10, gamma: 7 };
  await sensors.send("DeviceOrientation.setDeviceOrientationOverride", initial);
  await expect(page.locator(".s100-stage [role=status]")).toHaveText("Active");
  const baseline = deviceRotation(initial);
  if (!baseline) throw new Error("Invalid sensor fixture");
  const goal = baseline.multiply(initialPhoneRotation().invert());
  const euler = new Euler().setFromQuaternion(goal, "ZXY");
  const target = {
    alpha: (MathUtils.radToDeg(euler.z) + 360) % 360,
    beta: MathUtils.radToDeg(euler.x),
    gamma: MathUtils.radToDeg(euler.y),
  };
  const open = page.locator('.stage-view .gift-box[data-box-state="open"]');
  await expect(open).toHaveCount(0);
  for (let sample = 0; sample < 7; sample++) {
    await sensors.send("DeviceOrientation.setDeviceOrientationOverride", {
      ...target,
      alpha: target.alpha + (sample % 2 ? 1 : -1),
    });
    // The puzzle requires one continuous real second of observed samples.
    await page.waitForTimeout(220);
  }
  await expect(open).toHaveCount(1);
  const matrix = await phone.evaluate((node) => {
    const rotation = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return [rotation.m11, rotation.m22, rotation.m33];
  });
  for (const value of matrix) expect(value).toBeGreaterThan(0.99);
  await page.screenshot({
    path: testInfo.outputPath("upright-phone.png"),
    fullPage: true,
  });
  await sensors.send("DeviceOrientation.clearDeviceOrientationOverride");
});
