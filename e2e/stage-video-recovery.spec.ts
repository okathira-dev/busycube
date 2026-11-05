import { expect, type Page, test } from "@playwright/test";
import jsQR from "jsqr";

async function connect(page: Page, source: number, nodes: string[]) {
  await page
    .getByRole("button", {
      name: `Connect video source output ${source}`,
      exact: true,
    })
    .click();
  for (const node of nodes) {
    await page
      .getByRole("button", {
        name: `Connect transform input ${node}`,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: `Connect transform output ${node}`,
        exact: true,
      })
      .click();
  }
  await page
    .getByRole("button", { name: "Connect video output input", exact: true })
    .click();
}

test("all four real routes restore their QR, cables meet real terminals, reset and departure release output URLs", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const lines: number[][] = [];
    const urls: string[] = [];
    const revoked: string[] = [];
    Reflect.set(window, "patchNative", { lines, urls, revoked });
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const start = CanvasRenderingContext2D.prototype.moveTo;
    const curve = CanvasRenderingContext2D.prototype.bezierCurveTo;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("patch-cables")) lines.length = 0;
      clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.moveTo = function (x, y) {
      if (this.canvas.classList.contains("patch-cables")) lines.push([x, y]);
      start.call(this, x, y);
    };
    CanvasRenderingContext2D.prototype.bezierCurveTo = function (...args) {
      if (this.canvas.classList.contains("patch-cables"))
        lines.at(-1)?.push(args[4], args[5]);
      curve.apply(this, args);
    };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      urls.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      revoke(url);
    };
  });
  await page.goto("/?locale=en&stage=S-720");
  expect(await page.locator(".patchbay-puzzle").innerText()).not.toMatch(
    /Connect a source|∏/,
  );
  const cases = [
    { source: 1, nodes: ["t1a"], flag: "busycube{swap_halves}" },
    { source: 2, nodes: ["t2a"], flag: "busycube{merge_frames}" },
    { source: 3, nodes: ["t3a", "t2a"], flag: "busycube{odd_even_alpha}" },
    {
      source: 3,
      nodes: ["t1a", "t3a", "t2a", "t1b"],
      flag: "busycube{swap_route_beta}",
    },
  ];
  for (const [index, c] of cases.entries()) {
    await page
      .getByRole("button", { name: "Disconnect all", exact: true })
      .click();
    await connect(page, c.source, c.nodes);
    await expect(page.getByText("Output ready.", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    const output = page.getByLabel("Transformed video output", { exact: true });
    await expect
      .poll(() => output.evaluate((v: HTMLVideoElement) => v.readyState))
      .toBeGreaterThanOrEqual(2);
    const image = await output.evaluate((v: HTMLVideoElement) => {
      v.pause();
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No output context");
      context.drawImage(v, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        data: Array.from(
          context.getImageData(0, 0, canvas.width, canvas.height).data,
        ),
      };
    });
    expect(
      jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data,
    ).toBe(c.flag);
    await expect(
      page.locator(".patchbay-puzzle .gift-box").nth(index),
    ).toHaveAttribute("data-box-state", "ribboned");
    await page.getByRole("textbox", { name: "flag", exact: true }).fill(c.flag);
    await expect(
      page.locator(".patchbay-puzzle .gift-box").nth(index),
    ).toHaveAttribute("data-box-state", "open");
    const points = await page.evaluate(
      (nodes) => {
        const surface = document.querySelector(".video-patchbay__surface");
        if (!surface) throw new Error("No surface");
        const origin = surface.getBoundingClientRect();
        const center = (node: string, direction: string) => {
          const rect = surface
            .querySelector(
              `[data-port-node="${node}"][data-port-direction="${direction}"]`,
            )
            ?.getBoundingClientRect();
          if (!rect) throw new Error("No port");
          return [
            rect.left + rect.width / 2 - origin.left,
            rect.top + rect.height / 2 - origin.top,
          ];
        };
        return nodes
          .slice(0, -1)
          .map((node, i) => [
            ...center(node, "out"),
            ...center(nodes[i + 1] ?? "", "in"),
          ]);
      },
      [`source${c.source}`, ...c.nodes, "output"],
    );
    expect(
      await page.evaluate(() => Reflect.get(window, "patchNative").lines),
    ).toEqual(points);
  }
  await page.screenshot({
    path: info.outputPath("patch-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".video-patchbay").evaluate((surface) => {
    surface.scrollLeft = surface.scrollWidth;
  });
  await page.screenshot({
    path: info.outputPath("patch-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const r = Reflect.get(window, "patchNative");
        return r.urls.every((url: string) => r.revoked.includes(url));
      }),
    )
    .toBe(true);
});

test("failed real source fetch shows an icon with optional detail and never opens a box", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-720");
  await page.route("**/source-t1-*.webm", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await connect(page, 1, ["t1a"]);
  const detail = page.locator(".patch-error");
  await expect(detail).toBeVisible();
  expect(await detail.getAttribute("open")).toBeNull();
  await detail.locator("summary").click();
  await expect(detail).toContainText("Source unavailable");
  await expect(
    page.locator('.patchbay-puzzle .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Disconnect all", exact: true })
    .click();
  await expect(detail).toHaveCount(0);
  await expect(
    page.getByLabel("Video output idle", { exact: true }),
  ).toBeVisible();
});

test("reset aborts a pending native conversion fetch and late failure does not replace idle output", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (String(input).includes("source-t1"))
        Reflect.set(window, "patchFetchSignal", init?.signal);
      return native(input, init);
    };
  });
  await page.goto("/?locale=en&stage=S-720");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/source-t1-*.webm", async (route) => {
    if (route.request().resourceType() !== "fetch") {
      await route.continue();
      return;
    }
    await gate;
    await route.fulfill({ status: 503, body: "Late failure" });
  });
  await connect(page, 1, ["t1a"]);
  await expect(page.locator(".patch-processing")).toBeVisible();
  await page
    .getByRole("button", { name: "Disconnect all", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "patchFetchSignal")?.aborted),
    )
    .toBe(true);
  release();
  await expect(
    page.getByLabel("Video output idle", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".patch-error")).toHaveCount(0);
  await expect(
    page.locator('.patchbay-puzzle .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
});
