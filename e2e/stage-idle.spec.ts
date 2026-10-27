import { expect, test } from "@playwright/test";

for (const initial of ["active", "locked", "idle"]) {
  const initialLocked = initial === "locked";
  test(`native IdleDetector distinguishes idle/unlocked from locked (initial ${initial})`, async ({
    page,
    context,
  }, testInfo) => {
    const cdp = await context.newCDPSession(page);
    const { targetInfo } = await cdp.send("Target.getTargetInfo");
    await cdp.send("Browser.grantPermissions", {
      permissions: ["idleDetection"],
      origin: "http://127.0.0.1:4173",
      browserContextId: targetInfo.browserContextId,
    });
    await page.addInitScript(() => {
      const Native = IdleDetector;
      const records: {
        threshold: number | undefined;
        signal: AbortSignal | undefined;
      }[] = [];
      Reflect.set(window, "idleStartRecords", records);
      Reflect.set(window, "idleWakeRequests", 0);
      if (navigator.wakeLock)
        navigator.wakeLock.request = () => {
          Reflect.set(
            window,
            "idleWakeRequests",
            Reflect.get(window, "idleWakeRequests") + 1,
          );
          throw new Error("Idle stage cannot use Wake Lock");
        };
      Reflect.set(
        window,
        "IdleDetector",
        class extends Native {
          override start(options?: IdleDetectorStartOptions) {
            records.push({
              threshold: options?.threshold,
              signal: options?.signal,
            });
            return super.start(options);
          }
        },
      );
    });
    await page.goto("/?locale=en&stage=S-830");
    await cdp.send("Emulation.setIdleOverride", {
      isUserActive: initial !== "idle",
      isScreenUnlocked: !initialLocked,
    });
    await expect(page.locator(".stage-view__header > p")).toHaveText(/^L-/);
    const boxes = page.locator(".gift-box");
    await expect(boxes).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Start watching" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", {
        name: initialLocked ? /^Padlock:/ : /^Hourglass:/,
      })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => Reflect.get(window, "idleStartRecords").length),
      )
      .toBe(1);
    expect(
      await page.evaluate(
        () => Reflect.get(window, "idleStartRecords")[0].threshold,
      ),
    ).toBe(62_000);
    if (initial === "idle") {
      await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open");
      await expect(boxes.nth(1)).not.toHaveAttribute("data-box-state", "open");
      await page.getByRole("button", { name: /Next stage/ }).click();
      await expect(page.locator(".s830-wait")).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(() =>
            Reflect.get(window, "idleStartRecords").every(
              (record: { signal?: AbortSignal }) => record.signal?.aborted,
            ),
          ),
        )
        .toBe(true);
      expect(
        await page.evaluate(() => Reflect.get(window, "idleWakeRequests")),
      ).toBe(0);
      await cdp.send("Emulation.clearIdleOverride");
      return;
    }
    if (initialLocked) {
      await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
      await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
    } else {
      await expect(page.locator(".s830-boxes")).toHaveAttribute(
        "data-observing",
        "true",
      );
      await expect(boxes.nth(0)).not.toHaveAttribute("data-box-state", "open");
      await page.screenshot({
        path: testInfo.outputPath("idle-estimate.png"),
        fullPage: true,
      });
    }
    await cdp.send("Emulation.setIdleOverride", {
      isUserActive: false,
      isScreenUnlocked: true,
    });
    await expect(boxes.nth(0)).toHaveAttribute("data-box-state", "open", {
      timeout: 10_000,
    });
    if (!initialLocked) {
      await expect(boxes.nth(1)).not.toHaveAttribute("data-box-state", "open");
      await cdp.send("Emulation.setIdleOverride", {
        isUserActive: true,
        isScreenUnlocked: false,
      });
      await expect(boxes.nth(1)).toHaveAttribute("data-box-state", "open");
    }
    await expect
      .poll(() =>
        page.evaluate(() =>
          Reflect.get(window, "idleStartRecords").every(
            (record: { signal?: AbortSignal }) => record.signal?.aborted,
          ),
        ),
      )
      .toBe(true);
    expect(
      await page.evaluate(() => Reflect.get(window, "idleWakeRequests")),
    ).toBe(0);
    await cdp.send("Emulation.clearIdleOverride");
  });
}
