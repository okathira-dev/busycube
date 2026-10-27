import { expect, type Page, test } from "@playwright/test";

async function controlledPwa(page: Page) {
  await page.addInitScript(() => {
    const nativeMatch = window.matchMedia.bind(window);
    const modes = new Map<string, MediaQueryList>();
    let mode = "standalone";
    let consumer: ((params: LaunchParams) => void) | undefined;
    const state = {
      badge: [] as number[],
      clear: 0,
      permissions: 0,
      installed: false,
      relatedFailure: false,
      relatedCalls: 0,
      overlay: false,
      rect: { x: 12, y: 0, width: 400, height: 32 },
    };
    Reflect.set(window, "pwaFixture", state);
    window.matchMedia = (query) => {
      const result = query.match(/^\(display-mode: ([a-z-]+)\)$/);
      if (!result) return nativeMatch(query);
      const name = result[1];
      let media = modes.get(query);
      if (!media) {
        media = Object.assign(new EventTarget(), {
          matches: false,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
        });
        Object.defineProperty(media, "matches", { get: () => mode === name });
        modes.set(query, media);
      }
      return media;
    };
    Reflect.set(window, "pwaMode", (value: string) => {
      mode = value;
      for (const media of modes.values())
        media.dispatchEvent(new Event("change"));
    });
    Object.defineProperty(navigator, "setAppBadge", {
      configurable: true,
      value: async (n: number) => {
        state.badge.push(n);
      },
    });
    Object.defineProperty(navigator, "clearAppBadge", {
      configurable: true,
      value: async () => {
        state.clear++;
      },
    });
    Object.defineProperty(navigator, "getInstalledRelatedApps", {
      configurable: true,
      value: async () => {
        state.relatedCalls++;
        if (state.relatedFailure)
          throw new DOMException("fixture", "NotAllowedError");
        return state.installed
          ? [
              {
                platform: "webapp",
                id: `${location.origin}/`,
                url: `${location.origin}/manifest.webmanifest`,
              },
            ]
          : [];
      },
    });
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => "default",
    });
    Notification.requestPermission = async () => {
      state.permissions++;
      return "granted";
    };
    Object.defineProperty(window, "launchQueue", {
      configurable: true,
      value: {
        setConsumer(fn: (params: LaunchParams) => void) {
          consumer = fn;
        },
      },
    });
    Reflect.set(window, "pwaLaunch", (url: string) =>
      consumer?.({ targetURL: url, files: [] }),
    );
    const overlay = Object.assign(new EventTarget(), {
      getTitlebarAreaRect() {
        const r = state.rect;
        return new DOMRect(r.x, r.y, r.width, r.height);
      },
    });
    Object.defineProperty(overlay, "visible", { get: () => state.overlay });
    Object.defineProperty(navigator, "windowControlsOverlay", {
      configurable: true,
      value: overlay,
    });
  });
}
function box(page: Page, id: string) {
  const labels: Record<string, string> = {
    B01: "Screen with downward arrow",
    B02: "Busycube with badge",
    B03: "Shortcut arrow",
    B04: "Paper and pencil",
    B05: "Browser window with tabs",
    B06: "Window (in title bar)",
  };
  return page
    .getByLabel(new RegExp(`^${labels[id]?.replace(/[()]/g, "\\$&")}:`))
    .locator("..");
}

test("ordinary native browser display and a direct note URL cannot substitute for PWA launch or titlebar interaction", async ({
  page,
}, info) => {
  await page.goto("/?locale=en&stage=S-080&source=note");
  await expect(page.locator(".problem-gift")).toHaveCount(6);
  for (const id of ["B01", "B03", "B04", "B05", "B06"])
    await expect(box(page, id)).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: /^Window \(in title bar\):/ }).click();
  await expect(box(page, "B06")).toHaveAttribute("data-box-state", "ribboned");
  await expect(page.locator(".s080-puzzle a")).toHaveCount(0);
  const observation = await page.evaluate(async () => ({
    browser: matchMedia("(display-mode: browser)").matches,
    standalone: matchMedia("(display-mode: standalone)").matches,
    overlay: navigator.windowControlsOverlay?.visible,
    queue: typeof window.launchQueue?.setConsumer,
    related: await (
      navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<unknown[]>;
      }
    ).getInstalledRelatedApps?.(),
  }));
  expect(observation.browser).toBe(true);
  expect(observation.standalone).toBe(false);
  expect(observation.related).toEqual([]);
  await info.attach("native-pwa-capabilities", {
    body: JSON.stringify(observation),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath("pwa-browser.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("pwa-browser-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("six independent PWA boxes use external badge input, native-surface fixtures, and a bounded titlebar target", async ({
  page,
}, info) => {
  await controlledPwa(page);
  await page.goto("/?locale=en&stage=S-080&source=shortcut");
  await expect(box(page, "B01")).toHaveAttribute("data-box-state", "open");
  await expect(box(page, "B03")).toHaveAttribute("data-box-state", "open");
  await expect(box(page, "B04")).toHaveAttribute("data-box-state", "ribboned");
  await expect(page).not.toHaveURL(/source=/);
  const value = await page.evaluate(
    () => Reflect.get(window, "pwaFixture").badge[0] as number,
  );
  expect(value).toBeGreaterThanOrEqual(1);
  expect(value).toBeLessThanOrEqual(99);
  expect(await page.locator(".s080-puzzle").innerText()).not.toContain(
    String(value),
  );
  await page.getByLabel("Number", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(box(page, "B02")).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: /^Busycube with badge:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "pwaFixture").permissions),
    )
    .toBe(1);
  await page.getByLabel("Number", { exact: true }).fill(String(value));
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(box(page, "B02")).toHaveAttribute("data-box-state", "open");
  await page.evaluate(() =>
    Reflect.get(
      window,
      "pwaLaunch",
    )("https://other.invalid/?stage=S-080&source=note"),
  );
  await expect(box(page, "B04")).toHaveAttribute("data-box-state", "ribboned");
  await page.evaluate(() =>
    Reflect.get(
      window,
      "pwaLaunch",
    )(`${location.origin}/?stage=S-080&source=note`),
  );
  await expect(box(page, "B04")).toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    Reflect.get(window, "pwaFixture").installed = true;
    window.dispatchEvent(new Event("focus"));
  });
  await expect(box(page, "B05")).toHaveAttribute("data-box-state", "ribboned");
  await page.evaluate(() => Reflect.get(window, "pwaMode")("browser"));
  await expect(box(page, "B05")).toHaveAttribute("data-box-state", "open");
  await page.evaluate(() => {
    Reflect.get(window, "pwaFixture").overlay = true;
    Reflect.get(window, "pwaMode")("window-controls-overlay");
    navigator.windowControlsOverlay?.dispatchEvent(new Event("geometrychange"));
  });
  const bar = page.locator(".s080-titlebar");
  const target = page.getByRole("button", {
    name: /^Window \(in title bar\):/,
  });
  await expect(bar).toBeVisible();
  const bounds = await bar.boundingBox();
  const hit = await target.boundingBox();
  expect(bounds).toBeTruthy();
  expect(hit).toBeTruthy();
  if (bounds && hit) {
    expect(hit.x).toBeGreaterThanOrEqual(bounds.x);
    expect(hit.y).toBeGreaterThanOrEqual(bounds.y);
    expect(hit.x + hit.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(hit.y + hit.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
  await target.click();
  await expect(box(page, "B06")).toHaveAttribute("data-box-state", "open");
  await page.screenshot({
    path: info.outputPath("pwa-titlebar.png"),
    fullPage: true,
  });
  const clears = await page.evaluate(
    () => Reflect.get(window, "pwaFixture").clear as number,
  );
  await page
    .getByRole("button", { name: "Back to boxes", exact: true })
    .click();
  await expect(page.locator(".s080-titlebar")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "pwaFixture").clear))
    .toBe(clears + 1);
});
