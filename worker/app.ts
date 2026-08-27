import { Hono } from "hono";

type AssetBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type Bindings = {
  // Static Assets normally bypass the Worker. This binding is the fallback for
  // a request that entered one of the explicitly selected Worker routes.
  ASSETS: AssetBinding;
};

// Keep these paths static: request data must never be reflected into a Link
// header, and each URL is registered as a Payment Method identifier.
const paymentManifestRoutes = {
  "/payment/method": "/payment/payment-method-manifest.json",
  "/poc/payment/method": "/poc/payment/payment-method-manifest.json",
  "/poc/payment/decoy-method":
    "/poc/payment/decoy-payment-method-manifest.json",
} as const;

export const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (context, next) => {
  await next();
  // public/_headers applies only to Static Assets, so Worker responses need
  // their own copy of the relevant response hardening headers.
  context.header("Referrer-Policy", "strict-origin-when-cross-origin");
  context.header("X-Content-Type-Options", "nosniff");
});

for (const [route, manifestPath] of Object.entries(paymentManifestRoutes)) {
  // These endpoints publish metadata only: they do not accept credentials,
  // mutate state, or opt into cross-origin reads with a CORS header.
  app.on(["GET", "HEAD"], route, (context) =>
    context.body(null, 204, {
      "Cache-Control": "no-store",
      Link: `<${manifestPath}>; rel="payment-method-manifest"`,
    }),
  );
  app.all(route, (context) => context.body(null, 405, { Allow: "GET, HEAD" }));
}

// The Service Worker uses this uncached, body-free response to distinguish a
// real network round trip from a cached application response.
app.get("/offline-beacon/network-probe", (context) =>
  context.body(null, 204, { "Cache-Control": "no-store" }),
);

// Production routing invokes Hono only for run_worker_first paths. Retaining
// the binding fallback keeps preview/tests and future route patterns aligned
// with Cloudflare Static Assets instead of inventing a second file server.
app.notFound((context) => context.env.ASSETS.fetch(context.req.raw));
