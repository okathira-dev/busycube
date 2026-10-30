import { expect, test } from "@playwright/test";

test("the printed maze is navigable with real page controls, reset/reload reproduce it and a separate game gets another maze", async ({
  page,
  browser,
}, info) => {
  const boards: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "info" &&
      message.text().startsWith("Busycube S-670 maze v1\n")
    )
      boards.push(message.text());
  });
  await page.goto("/?locale=en&stage=S-670");
  await expect(page.locator(".s670-location")).toHaveText("1:1");
  await expect.poll(() => boards.length).toBeGreaterThan(0);
  const initial = boards.at(-1);
  if (!initial) throw new Error("No Console maze");
  const rows = initial.split("\n").slice(1);
  expect(rows).toHaveLength(21);
  expect(await page.locator(".s670-puzzle").innerText()).not.toMatch(
    /console|printed|open.*board/i,
  );
  const gift = page.locator(".s670-puzzle .gift-box");
  await page.getByRole("button", { name: "Up arrow", exact: true }).click();
  await expect(page.locator(".s670-location")).toHaveText("1:1");
  await expect(gift).toHaveAttribute("data-box-state", "ribboned");
  expect(boards.at(-1)).toBe(initial);
  await page.screenshot({
    path: info.outputPath("maze-desktop.png"),
    fullPage: true,
  });
  const queue = [
    {
      row: 1,
      column: 1,
      path: [] as { name: string; row: number; column: number }[],
    },
  ];
  const seen = new Set(["1,1"]);
  let route = queue[0]?.path ?? [];
  for (const p of queue) {
    if (rows[p.row]?.[p.column] === "E") {
      route = p.path;
      break;
    }
    for (const [dr, dc, name] of [
      [-1, 0, "Up arrow"],
      [1, 0, "Down arrow"],
      [0, -1, "Left arrow"],
      [0, 1, "Right arrow"],
    ] as const) {
      const row = p.row + dr,
        column = p.column + dc,
        key = `${row},${column}`;
      if (!rows[row]?.[column] || rows[row]?.[column] === "#" || seen.has(key))
        continue;
      seen.add(key);
      queue.push({ row, column, path: [...p.path, { name, row, column }] });
    }
  }
  expect(route.length).toBeGreaterThan(10);
  for (const step of route) {
    await page.getByRole("button", { name: step.name, exact: true }).click();
    await expect(page.locator(".s670-location")).toHaveText(
      `${step.row}:${step.column}`,
    );
    expect(boards.at(-1)?.split("\n")[step.row + 1]?.[step.column]).toBe("@");
  }
  await expect(gift).toHaveAttribute("data-box-state", "open");
  await page
    .getByRole("button", { name: "Rotating arrow", exact: true })
    .click();
  await expect(page.locator(".s670-location")).toHaveText("1:1");
  expect(boards.at(-1)).toBe(initial);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("maze-mobile.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(gift).toHaveAttribute("data-box-state", "closed");
  expect(boards.at(-1)).toBe(initial);
  const context = await browser.newContext();
  const other = await context.newPage();
  let otherBoard = "";
  other.on("console", (message) => {
    if (message.text().startsWith("Busycube S-670 maze v1\n"))
      otherBoard = message.text();
  });
  await other.goto("http://127.0.0.1:4173/?locale=en&stage=S-670");
  await expect(other.locator(".s670-location")).toHaveText("1:1");
  expect(otherBoard).toBeTruthy();
  expect(otherBoard).not.toBe(initial);
  await context.close();
});
