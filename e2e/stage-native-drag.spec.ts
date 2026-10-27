import { expect, test } from "@playwright/test";

test("requires a readable native File alongside the image URI and rejects another diagram", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-510");
  await page.evaluate(() => {
    window.addEventListener(
      "drop",
      (event) => {
        document.body.dataset.testDropFileCount = String(
          event.dataTransfer?.files.length ?? 0,
        );
        document.body.dataset.testDrop = JSON.stringify({
          trusted: event.isTrusted,
          types: [...(event.dataTransfer?.types ?? [])],
          uri: event.dataTransfer?.getData("text/uri-list"),
          files: [...(event.dataTransfer?.files ?? [])].map((file) => ({
            size: file.size,
            type: file.type,
            name: file.name,
          })),
        });
      },
      { capture: true },
    );
  });
  const zones = page.locator(".native-drop-target");
  const image = page.locator('.native-drag-image[draggable="true"]');
  await expect(zones).toHaveCount(3);
  await expect(
    page.locator('.native-drag-image[draggable="false"]'),
  ).toHaveCount(1);
  await image.dragTo(zones.nth(0));
  await testInfo.attach("native-payload", {
    body: await page.evaluate(
      () => document.body.dataset.testDrop ?? "no drop",
    ),
    contentType: "application/json",
  });
  const hasFile = await page.evaluate(
    () => Number(document.body.dataset.testDropFileCount) > 0,
  );
  if (hasFile) {
    await expect(zones.nth(0)).toHaveAttribute("data-drop-state", "accepted");
    await expect(zones.nth(0).locator(".gift-box")).toHaveAttribute(
      "data-box-state",
      "open",
    );
  } else {
    await expect(zones.nth(0)).toHaveAttribute("data-drop-state", "rejected");
    await expect(zones.nth(0).locator(".gift-box")).not.toHaveAttribute(
      "data-box-state",
      "open",
    );
    testInfo.annotations.push({
      type: "observation",
      description:
        "Native Chromium drag supplied a URI but no File; verified rejection. The accepted route was not observed in this run.",
    });
  }
  await image.dragTo(zones.nth(1));
  await expect(zones.nth(1)).toHaveAttribute("data-drop-state", "rejected");
  await expect(zones.nth(1).locator(".gift-box")).not.toHaveAttribute(
    "data-box-state",
    "open",
  );
  await page.screenshot({
    path: testInfo.outputPath("native-drag.png"),
    fullPage: true,
  });
});
