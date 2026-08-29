import { Hono } from "hono";

type AssetBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type Bindings = {
  // Static Assetsは通常Workerを通らない。明示的に選択したWorker routeへ
  // 入ったrequestを静的assetへ戻す場合だけ、このbindingをfallbackに使う。
  ASSETS: AssetBinding;
};

// request由来の値をLink headerへ反映しないため、pathは静的な許可リストにする。
// 各URLはPayment Methodの識別子として登録されるため、動的生成しない。
const paymentManifestRoutes = {
  "/payment/method": "/payment/payment-method-manifest.json",
  "/poc/payment/method": "/poc/payment/payment-method-manifest.json",
  "/poc/payment/decoy-method":
    "/poc/payment/decoy-payment-method-manifest.json",
} as const;

export const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (context, next) => {
  await next();
  // public/_headersはStatic Assetsだけに適用されるため、Worker responseには
  // 必要な防御用headerをここでも付与する。
  context.header("Referrer-Policy", "strict-origin-when-cross-origin");
  context.header("X-Content-Type-Options", "nosniff");
});

for (const [route, manifestPath] of Object.entries(paymentManifestRoutes)) {
  // このendpointはmetadataを公開するだけで、credentialを受け取らず、状態も
  // 変更しない。CORS headerを付けてcross-origin readを許可することもない。
  app.on(["GET", "HEAD"], route, (context) =>
    context.body(null, 204, {
      "Cache-Control": "no-store",
      Link: `<${manifestPath}>; rel="payment-method-manifest"`,
    }),
  );
  app.all(route, (context) => context.body(null, 405, { Allow: "GET, HEAD" }));
}

// Service Workerはcacheされないbodyなしresponseを使い、実network往復と
// cache済みapplication responseを区別する。
app.get("/offline-beacon/network-probe", (context) =>
  context.body(null, 204, { "Cache-Control": "no-store" }),
);

// 本番routingはrun_worker_firstのpathだけでHonoを呼ぶ。binding fallbackを
// 残すことで、別のfile serverを実装せず、preview／test／将来のrouteも
// Cloudflare Static Assetsと同じ配信経路へ揃える。
app.notFound((context) => context.env.ASSETS.fetch(context.req.raw));
