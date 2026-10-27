import { expect, type Page, test } from "@playwright/test";

test("two native BroadcastChannel screens conceal hands, play draw/P2 win/P1 win, and exclude a third screen", async ({
  page,
  context,
}, info) => {
  await context.addInitScript(() => {
    const messages: unknown[] = [];
    Reflect.set(window, "duelMessages", messages);
    const send = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function (data) {
      if (this.name === "busycube-stage-S-940-v1") messages.push(data);
      return send.call(this, data);
    };
  });
  await page.goto("/?locale=en&stage=S-940");
  await expect(page.getByRole("status")).toHaveText("Waiting for an opponent");
  const second = await context.newPage();
  await second.goto("/?locale=en&stage=S-940");
  await expect
    .poll(async () =>
      [
        await page.locator(".s940-arena").getAttribute("data-role"),
        await second.locator(".s940-arena").getAttribute("data-role"),
      ].sort(),
    )
    .toEqual(["1", "2"]);
  const p1 =
    (await page.locator(".s940-arena").getAttribute("data-role")) === "1"
      ? page
      : second;
  const p2 = p1 === page ? second : page;
  const gift = (screen: Page) => screen.locator(".s940-stage .gift-box");
  await expect(gift(p1)).toHaveAttribute("data-box-state", "ribboned");
  const third = await context.newPage();
  await third.goto("/?locale=en&stage=S-940");
  await expect(third.getByRole("status")).toHaveText("Waiting for an opponent");
  await expect(
    third.getByRole("button", { name: "Rock", exact: true }),
  ).toBeDisabled();
  await expect(p1.getByRole("button", { name: /Online match/ })).toBeDisabled();
  await p2.getByRole("button", { name: "Paper", exact: true }).click();
  await expect(
    p1.getByRole("img", { name: "Opponent", exact: true }),
  ).toHaveText("?");
  await expect(gift(p1)).toHaveAttribute("data-box-state", "ribboned");
  await p1.getByRole("button", { name: "Paper", exact: true }).click();
  await expect(p1.getByRole("status")).toHaveText("Draw");
  await expect(p2.getByRole("status")).toHaveText("Draw");
  await expect(gift(p1)).toHaveAttribute("data-box-state", "ribboned");
  await p1.getByRole("button", { name: "Next round", exact: true }).click();
  await p1.getByRole("button", { name: "Scissors", exact: true }).click();
  await p2.getByRole("button", { name: "Rock", exact: true }).click();
  await expect(p1.getByRole("status")).toHaveText("P2 wins");
  await expect(gift(p1)).toHaveAttribute("data-box-state", "ribboned");
  const stale = await p2.evaluate(() =>
    Reflect.get(window, "duelMessages").findLast(
      (message: { type: string }) => message.type === "move",
    ),
  );
  await p1.getByRole("button", { name: "Next round", exact: true }).click();
  await third.evaluate((message) => {
    const channel = new BroadcastChannel("busycube-stage-S-940-v1");
    channel.postMessage(message);
    channel.close();
  }, stale);
  await p1.getByRole("button", { name: "Paper", exact: true }).click();
  await expect(gift(p1)).toHaveAttribute("data-box-state", "ribboned");
  await expect(
    p1.getByRole("img", { name: "Opponent", exact: true }),
  ).toHaveText("?");
  await p2.getByRole("button", { name: "Rock", exact: true }).click();
  await expect(p1.getByRole("status")).toHaveText("P1 wins");
  await expect(gift(p1)).toHaveAttribute("data-box-state", "open");
  await expect(gift(third)).toHaveAttribute("data-box-state", "ribboned");
  await p1.screenshot({ path: info.outputPath("duel-p1.png") });
  await p2.screenshot({ path: info.outputPath("duel-p2.png") });
  await p1.setViewportSize({ width: 390, height: 844 });
  await p1.screenshot({
    path: info.outputPath("duel-mobile.png"),
    fullPage: true,
  });
  expect(
    await p1.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await third.close();
  await p2.close();
  await expect(p1.getByRole("status")).toHaveText("Waiting for an opponent");
  await p1.reload();
  await expect(gift(p1)).toHaveAttribute("data-box-state", "closed");
});
