import { expect, test } from "@playwright/test";

test("self-hosted wallet manifests and controlled payment responses preserve four independent boxes", async ({
  page,
  request,
}, info) => {
  // Native registration/HTTP/ServiceWorker identities; the payment response and
  // retry-event delivery are controlled. This does not certify browser payment UI.
  await page.addInitScript(() => {
    const f = { requests: [] as unknown[], handlers: [] as EventListener[] };
    Reflect.set(window, "paymentFixture", f);
    const container = navigator.serviceWorker;
    const native = container.addEventListener.bind(container);
    container.addEventListener = ((
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === "message") f.handlers.push(listener);
      native(type, listener, options);
    }) as typeof container.addEventListener;
    Reflect.set(
      window,
      "PaymentRequest",
      class {
        methods: unknown;
        details: { id: string };
        resolve: ((response: unknown) => void) | undefined;
        completions: string[] = [];
        retries = 0;
        retryResolve: (() => void) | undefined;
        aborted = 0;
        constructor(methods: unknown, details: { id: string }) {
          this.methods = methods;
          this.details = details;
          f.requests.push(this);
        }
        show() {
          return new Promise((resolve) => {
            this.resolve = resolve;
          });
        }
        async abort() {
          this.aborted++;
        }
        answer(outcome: string) {
          this.resolve?.({
            requestId: this.details.id,
            methodName: `${location.origin}/payment/method`,
            details: {
              outcome,
              accepted: outcome === "approved",
              wallet: "diamond",
            },
            complete: async (value: string) => {
              this.completions.push(value);
            },
            retry: () => {
              this.retries++;
              return new Promise<void>((resolve) => {
                this.retryResolve = resolve;
              });
            },
          });
        }
      },
    );
    Reflect.set(f, "event", async (index: number, wallet = "diamond") => {
      const a = Reflect.get(f.requests[index] as object, "details");
      const registration = await container.getRegistration(
        `/payment/wallet-${wallet}/`,
      );
      const event = {
        isTrusted: true,
        origin: location.origin,
        source: registration?.active,
        data: {
          channel: "busycube-payment",
          type: "handler-event",
          requestId: a.id,
          eventId: crypto.randomUUID(),
          methodName: `${location.origin}/payment/method`,
          trusted: true,
          wallet,
        },
      };
      for (const callback of f.handlers)
        Reflect.apply(callback, container, [event]);
    });
  });
  const method = await request.get("/payment/method");
  expect(method.status()).toBe(204);
  expect(method.headers().link).toContain("payment-method-manifest.json");
  const manifest = await request.get(
    "/payment/wallet-diamond/payment-app-manifest.json",
  );
  expect((await manifest.json()).name).toBe("Busycube Wallet");
  expect(
    (await request.get("/payment/wallet-diamond/wallet-icon.svg")).body(),
  ).toBeDefined();
  await page.goto("/?locale=en&stage=S-780");
  const gifts = page.locator(".s780-puzzle .gift-box");
  const requests = () =>
    page.evaluate(() => Reflect.get(window, "paymentFixture").requests.length);
  expect(await requests()).toBe(0);
  await expect(gifts).toHaveCount(4);
  await gifts.nth(0).click();
  await expect.poll(requests).toBe(1);
  expect(
    await page.evaluate(
      () => Reflect.get(window, "paymentFixture").requests[0].details.total,
    ),
  ).toEqual({ label: "BCU", amount: { currency: "BCU", value: "1.00" } });
  await page.evaluate(() =>
    Reflect.get(window, "paymentFixture").requests[0].answer("approved"),
  );
  await expect(gifts.nth(0)).toHaveAttribute("data-box-state", "open");
  await expect(gifts.nth(3)).toHaveAttribute("data-box-state", "ribboned");
  await gifts.nth(1).click();
  await expect.poll(requests).toBe(2);
  await page.evaluate(() =>
    Reflect.get(window, "paymentFixture").requests[1].answer("declined"),
  );
  await expect(gifts.nth(1)).toHaveAttribute("data-box-state", "open");
  await gifts.nth(2).click();
  await expect.poll(requests).toBe(3);
  await page.evaluate(() => Reflect.get(window, "paymentFixture").event(2));
  await expect(gifts.nth(3)).toHaveAttribute("data-box-state", "open");
  await page.evaluate(() =>
    Reflect.get(window, "paymentFixture").requests[2].answer("needs-retry"),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "paymentFixture").requests[2].retries,
      ),
    )
    .toBe(1);
  await expect(gifts.nth(2)).toHaveAttribute("data-box-state", "ribboned");
  await page.evaluate(() => Reflect.get(window, "paymentFixture").event(2));
  await expect(gifts.nth(2)).toHaveAttribute("data-box-state", "open");
  expect(
    await page.evaluate(
      () => Reflect.get(window, "paymentFixture").requests[2].completions,
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.evaluate(() =>
    Reflect.get(window, "paymentFixture").requests[2].retryResolve(),
  );
  await page.screenshot({ path: info.outputPath("payment-pc.png") });
  await page.reload();
  await expect(gifts.nth(2)).toHaveAttribute("data-box-state", "closed");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("payment-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
