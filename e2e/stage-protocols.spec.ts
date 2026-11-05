import { expect, type Page, test } from "@playwright/test";

async function observe(page: Page, appMode = false) {
  await page.addInitScript((isApp) => {
    const match = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = match(query);
      if (query === "(display-mode: standalone)")
        Object.defineProperty(result, "matches", { value: isApp });
      return result;
    };
    const events: unknown[] = [];
    Reflect.set(window, "protocolCalls", events);
    const register = navigator.registerProtocolHandler.bind(navigator);
    navigator.registerProtocolHandler = (scheme, url) => {
      register(scheme, url);
      events.push({ type: "register", scheme, url });
    };
    const nav = navigator as Navigator & {
      unregisterProtocolHandler: (scheme: string, url: string) => void;
    };
    const unregister = nav.unregisterProtocolHandler.bind(nav);
    nav.unregisterProtocolHandler = (scheme, url) => {
      unregister(scheme, url);
      events.push({ type: "unregister", scheme, url });
    };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.protocol === "web+busycube:" || this.protocol === "wtai:") {
        events.push({ type: "outgoing", href: this.href });
        return;
      }
      click.call(this);
    };
  }, appMode);
}
const gift = (page: Page, index: number) =>
  page.locator(".s450-puzzle .gift-box").nth(index);
function delivered(uri: string, entry: string) {
  return `/?stage=S-450&locale=en&entry=${entry}&protocol=${encodeURIComponent(uri)}`;
}

test("custom URI receipt matches only in controlled app display; no browser API is used to register the PWA scheme", async ({
  page,
  context,
}, info) => {
  await observe(page);
  await page.goto("/?locale=en&stage=S-450");
  await page.getByRole("button", { name: /^Arrow leaving a square:/ }).click();
  const uri = await page
    .getByRole("link", { name: "web+busycube:" })
    .getAttribute("href");
  if (!uri) throw new Error("No outgoing game URI");
  expect(uri).toMatch(/^web\+busycube:open\?round=/);
  expect(
    await page.evaluate(() => Reflect.get(window, "protocolCalls")),
  ).toEqual([{ type: "outgoing", href: uri }]);
  await expect(gift(page, 0)).toHaveAttribute("data-box-state", "ribboned");
  await page.goto(delivered(uri, "app"));
  await expect(gift(page, 0)).toHaveAttribute("data-box-state", "ribboned");
  const app = await context.newPage();
  await observe(app, true);
  await app.goto(delivered(uri, "app"));
  await expect(gift(app, 0)).toHaveAttribute("data-box-state", "open");
  expect(new URL(app.url()).searchParams.has("protocol")).toBe(false);
  await expect(gift(app, 1)).toHaveAttribute("data-box-state", "ribboned");
  await app.screenshot({
    path: info.outputPath("protocol-desktop.png"),
    fullPage: true,
  });
  await app.setViewportSize({ width: 390, height: 844 });
  expect(
    await app.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await app.screenshot({
    path: info.outputPath("protocol-mobile.png"),
    fullPage: true,
  });
  await app.close();
});

test("native browser registration alone never clears; a controlled URI delivery clears only wtai and cleanup unregisters this template", async ({
  page,
}) => {
  await observe(page);
  await page.goto("/?locale=en&stage=S-450");
  await page.getByRole("button", { name: /^Chain links:/ }).click();
  const uri = await page
    .getByRole("link", { name: "wtai:" })
    .getAttribute("href");
  if (!uri) throw new Error("No wtai game URI");
  expect(uri).toMatch(/^wtai:busycube\?round=/);
  const template =
    "http://127.0.0.1:4173/?stage=S-450&entry=browser&protocol=%s";
  expect(
    await page.evaluate(() => Reflect.get(window, "protocolCalls")),
  ).toEqual([{ type: "register", scheme: "wtai", url: template }]);
  await expect(gift(page, 1)).toHaveAttribute("data-box-state", "ribboned");
  // Controlled transport: native permission/OS association is not exercised.
  await page.goto(delivered(uri, "browser"));
  await expect(gift(page, 1)).toHaveAttribute("data-box-state", "open");
  await expect(gift(page, 0)).toHaveAttribute("data-box-state", "ribboned");
  await page.getByRole("button", { name: "Remove the wtai handler" }).click();
  expect(
    await page.evaluate(() => Reflect.get(window, "protocolCalls")),
  ).toEqual([{ type: "unregister", scheme: "wtai", url: template }]);
  await page.goto(delivered(uri, "browser"));
  await expect(gift(page, 1)).toHaveAttribute("data-box-state", "closed");
  await expect(page.getByRole("status")).toContainText(/invalid/i);
});
