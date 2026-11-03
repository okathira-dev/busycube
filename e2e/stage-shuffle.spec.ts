import { expect, test } from "@playwright/test";

test("shuffles closed boxes five times and conceals the answer until an explicit retry", async ({
  page,
}, testInfo) => {
  await page.goto("/?locale=en&stage=S-340");
  const ring = page.locator(".shuffle-ring");
  const tokens = page.locator(".shuffle-token");
  await expect(ring).toHaveAttribute("data-phase", "showing");
  await expect(tokens).toHaveCount(10);
  await page.screenshot({ path: testInfo.outputPath("shuffle-prompt.png") });
  const winner = await tokens.evaluateAll((elements) =>
    elements.findIndex((element) =>
      element.querySelector('.gift-box[data-box-state="open"]'),
    ),
  );
  expect(winner).toBeGreaterThanOrEqual(0);
  const initialUrl = page.url();
  await page.evaluate(() => {
    const snapshots: {
      before: string[];
      after: string[];
      concealed: boolean;
      finished: boolean;
    }[] = [];
    Object.assign(window, { shuffleSnapshots: snapshots });
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = (update) => {
      const elements = [...document.querySelectorAll(".shuffle-token")];
      const positions = () =>
        elements.map((element) => element.getAttribute("style") ?? "");
      const snapshot = {
        before: positions(),
        after: [] as string[],
        concealed: elements.every((element) => {
          const box = element.querySelector(".gift-box");
          const lid = element.querySelector(".gift-box__lid");
          const visual = element.querySelector(".gift-box__visual");
          return (
            box?.getAttribute("data-box-state") === "closed" &&
            lid !== null &&
            getComputedStyle(lid).transform === "none" &&
            visual !== null &&
            getComputedStyle(visual).filter === "none"
          );
        }),
        finished: false,
      };
      snapshots.push(snapshot);
      const transition = start(update);
      void transition.finished.then(() => {
        snapshot.after = positions();
        snapshot.finished = true;
      });
      return transition;
    };
  });
  await page
    .getByRole("button", { name: "Opposing arrows", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-phase", "moving");
  await expect(
    page.locator('.shuffle-token .gift-box[data-box-state="open"]'),
  ).toHaveCount(0);
  for (const button of await tokens.locator("button").all())
    await expect(button).toBeDisabled();
  await expect(ring).toHaveAttribute("data-phase", "choosing");
  const snapshots = await page.evaluate(
    () =>
      (
        window as typeof window & {
          shuffleSnapshots: {
            before: string[];
            after: string[];
            concealed: boolean;
            finished: boolean;
          }[];
        }
      ).shuffleSnapshots,
  );
  expect(snapshots).toHaveLength(5);
  for (const snapshot of snapshots) {
    expect(snapshot.concealed).toBe(true);
    expect(snapshot.finished).toBe(true);
    expect(
      snapshot.after.every((style, index) => style !== snapshot.before[index]),
    ).toBe(true);
  }
  expect(page.url()).toBe(initialUrl);
  await tokens
    .nth((winner + 1) % 10)
    .locator("button")
    .click();
  await expect(ring).toHaveAttribute("data-phase", "wrong");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(tokens.locator('.gift-box[data-box-state="open"]')).toHaveCount(
    0,
  );
  // The old automatic reset must not reveal a new winner after a wrong guess.
  await page.waitForTimeout(750);
  await expect(ring).toHaveAttribute("data-phase", "wrong");
  await expect(tokens.locator('.gift-box[data-box-state="open"]')).toHaveCount(
    0,
  );
  await page.screenshot({ path: testInfo.outputPath("shuffle-wrong.png") });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(ring).toHaveAttribute("data-phase", "showing");
  const nextWinner = await tokens.evaluateAll((elements) =>
    elements.findIndex((element) =>
      element.querySelector('.gift-box[data-box-state="open"]'),
    ),
  );
  expect(nextWinner).not.toBe(winner);
  await page
    .getByRole("button", { name: "Opposing arrows", exact: true })
    .click();
  await expect(ring).toHaveAttribute("data-phase", "choosing");
  await tokens.nth(nextWinner).locator("button").click();
  await expect(ring).toHaveAttribute("data-phase", "done");
  await expect(page.locator(".stage-state")).toHaveText("1/1");
});

test("keeps answers disabled if a later shuffle transition fails", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-340");
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document);
    let count = 0;
    document.startViewTransition = (update) => {
      count += 1;
      if (count === 3) throw new Error("Transition unavailable");
      return start(update);
    };
  });
  await page
    .getByRole("button", { name: "Opposing arrows", exact: true })
    .click();
  await expect(page.locator(".shuffle-ring")).toHaveAttribute(
    "data-phase",
    "error",
  );
  await expect(page.getByRole("status")).toHaveText(
    "Could not start the transition.",
  );
  for (const button of await page.locator(".shuffle-token button").all())
    await expect(button).toBeDisabled();
  await expect(page.locator(".stage-state")).toHaveText("0/1");
  await page
    .getByRole("button", { name: "Opposing arrows", exact: true })
    .click();
  await expect(page.locator(".shuffle-ring")).toHaveAttribute(
    "data-phase",
    "choosing",
  );
});

test("opens the timing box from the real animation paused in its target band", async ({
  page,
}) => {
  await page.goto("/?locale=en&stage=S-170");
  await page.getByRole("button", { name: "Pause", exact: true }).focus();
  await page.waitForFunction(() => {
    const progress = document
      .querySelector(".timing-meter__fill")
      ?.getAnimations()[0]
      ?.effect?.getComputedTiming().progress;
    return (
      typeof progress === "number" && progress >= 0.955 && progress <= 0.975
    );
  });
  await page.keyboard.press("Enter");
  await expect(
    page.locator('.stage-view .gift-box[data-box-state="open"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
});
