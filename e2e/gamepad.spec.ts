import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    gamepadFixture: {
      connected: boolean;
      mapping: string;
      buttons: number[];
      axes: number[];
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.gamepadFixture = {
      connected: false,
      mapping: "standard",
      buttons: [],
      axes: [0, 0, 0, 0],
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => {
        const fixture = window.gamepadFixture;
        return [
          null,
          {
            connected: fixture.connected,
            mapping: fixture.mapping,
            axes: fixture.axes,
            buttons: Array.from({ length: 17 }, (_, index) => ({
              pressed: fixture.buttons.includes(index),
              value: fixture.buttons.includes(index) ? 1 : 0,
            })),
          },
        ];
      },
    });
  });
});

test("opens one box only after every physical control has been observed", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-200");
  const status = page.locator(".gamepad-puzzle").getByRole("status");
  const box = page.locator(".gamepad-reward .gift-box");
  await expect(
    page.getByRole("heading", { name: "Gamer", exact: true }),
  ).toBeVisible();
  await expect(status).toHaveCount(0);
  await expect(box).toHaveCount(1);
  await page.evaluate(() => {
    Object.assign(window.gamepadFixture, {
      connected: true,
      mapping: "",
      buttons: Array.from({ length: 16 }, (_, index) => index),
      axes: [1, 1, 1, 1],
    });
  });
  await expect(status).toHaveCount(0);
  await expect(page.locator('.gamepad-input[data-seen="true"]')).toHaveCount(0);
  await expect(box).not.toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    Object.assign(window.gamepadFixture, {
      mapping: "standard",
      buttons: [],
      axes: [0, 0, 0, 0],
    });
  });
  await expect(status).toHaveCount(0);
  for (let index = 0; index < 16; index++) {
    await page.evaluate((button) => {
      window.gamepadFixture.buttons = [button];
    }, index);
    await expect(page.locator('.gamepad-input[data-seen="true"]')).toHaveCount(
      index + 1,
    );
    await expect(box).not.toHaveAttribute("data-box-state", "open");
  }
  await expect(page.locator('[data-input="L3"]')).toHaveAttribute(
    "data-seen",
    "true",
  );
  await expect(page.locator('[data-input="R3"]')).toHaveAttribute(
    "data-seen",
    "true",
  );
  await expect(page.locator('[data-input="L"]')).toHaveAttribute(
    "data-active",
    "false",
  );
  for (const sign of [-1, 1]) {
    await page.evaluate((value) => {
      window.gamepadFixture.buttons = [];
      window.gamepadFixture.axes = [
        value,
        value,
        value,
        value === 1 ? 0 : value,
      ];
    }, sign);
    await expect(page.locator('.gamepad-input[data-seen="true"]')).toHaveCount(
      sign === -1 ? 20 : 23,
    );
    await expect(box).not.toHaveAttribute("data-box-state", "open");
  }
  await page.evaluate(() => {
    window.gamepadFixture.axes[3] = 1;
  });
  await expect(page.locator('.gamepad-input[data-seen="true"]')).toHaveCount(
    24,
  );
  await expect(box).toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    window.gamepadFixture.connected = false;
  });
  await expect(status).toHaveCount(0);
  await expect(page.locator('.gamepad-input[data-active="true"]')).toHaveCount(
    0,
  );
  await expect(page.locator('.gamepad-input[data-seen="true"]')).toHaveCount(
    24,
  );
});

test("shows an unlabeled controller and a single adjacent box without overflow", async ({
  page,
}, testInfo) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?locale=ja&stage=S-200");
    await expect(page.locator(".gamepad-diagram")).toBeVisible();
    await expect(page.locator(".gamepad-diagram")).toHaveText("");
    await expect(page.locator(".gamepad-input")).toHaveCount(24);
    await expect(page.locator(".gamepad-part-number")).toHaveCount(0);
    await expect(page.locator(".gamepad-reward .gift-box")).toHaveCount(1);
    const rect = async (selector: string) => {
      const result = await page.locator(selector).boundingBox();
      if (!result) throw new Error(`Missing ${selector}`);
      return result;
    };
    const left = await rect('[data-part="dpad"]');
    const right = await rect('[data-part="face"]');
    const trigger = await rect('[data-input="ZL"]');
    const shoulder = await rect('[data-input="L"]');
    const stick = await rect('[data-part="left-stick"]');
    const diagram = await rect(".gamepad-diagram");
    const reward = await rect(".gamepad-reward");
    expect(left.x).toBeLessThan(right.x);
    expect(trigger.y).toBeLessThan(shoulder.y);
    expect(shoulder.y - trigger.y).toBeLessThan(trigger.height / 2);
    expect(stick.y).toBeGreaterThan(left.y);
    if (width === 1440)
      expect(reward.x).toBeGreaterThanOrEqual(diagram.x + diagram.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: testInfo.outputPath(`gamepad-${width}.png`),
      fullPage: true,
    });
  }
});
