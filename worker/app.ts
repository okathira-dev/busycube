import { Hono } from "hono";

type AssetBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type Bindings = {
  ASSETS: AssetBinding;
};

const paymentManifestRoutes = {
  "/payment/method": "/payment/payment-method-manifest.json",
  "/poc/payment/method": "/poc/payment/payment-method-manifest.json",
  "/poc/payment/decoy-method":
    "/poc/payment/decoy-payment-method-manifest.json",
} as const;

export const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (context, next) => {
  await next();
  context.header("Referrer-Policy", "strict-origin-when-cross-origin");
  context.header("X-Content-Type-Options", "nosniff");
});

for (const [route, manifestPath] of Object.entries(paymentManifestRoutes)) {
  app.on(["GET", "HEAD"], route, (context) =>
    context.body(null, 204, {
      "Cache-Control": "no-store",
      Link: `<${new URL(manifestPath, context.req.url).pathname}>; rel="payment-method-manifest"`,
    }),
  );
  app.all(route, (context) => context.body(null, 405, { Allow: "GET, HEAD" }));
}

app.get("/offline-beacon/network-probe", (context) =>
  context.body(null, 204, { "Cache-Control": "no-store" }),
);

app.notFound((context) => context.env.ASSETS.fetch(context.req.raw));
