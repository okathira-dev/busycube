import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = resolve(import.meta.dirname, "src");
const outDir = resolve(import.meta.dirname, "dist");

const paymentManifestRoutes = new Map([
  ["/payment/method", "/payment/payment-method-manifest.json"],
  ["/poc/payment/method", "/poc/payment/payment-method-manifest.json"],
  [
    "/poc/payment/decoy-method",
    "/poc/payment/decoy-payment-method-manifest.json",
  ],
]);

function paymentManifestLinkPlugin(): Plugin {
  const handle = (
    request: { url?: string },
    response: {
      statusCode: number;
      setHeader(name: string, value: string): void;
      end(body?: string): void;
    },
    next: () => void,
  ) => {
    const pathname = new URL(request.url ?? "/", "http://busycube.local")
      .pathname;
    const manifestPath = paymentManifestRoutes.get(pathname);
    if (!manifestPath) {
      next();
      return;
    }

    response.statusCode = 204;
    response.setHeader(
      "Link",
      `<${manifestPath}>; rel="payment-method-manifest"`,
    );
    response.setHeader("Cache-Control", "no-store");
    response.end();
  };

  return {
    name: "busycube-payment-method-manifest-link",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== "HEAD" && request.method !== "GET") {
          next();
          return;
        }
        handle(request, response, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== "HEAD" && request.method !== "GET") {
          next();
          return;
        }
        handle(request, response, next);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  root,
  envDir: import.meta.dirname,
  appType: "mpa",
  assetsInclude: ["**/*.pack"],
  plugins: [react(), paymentManifestLinkPlugin()],
  worker: { format: "es" },
  build: {
    outDir,
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: resolve(root, "index.html"),
        poc: resolve(root, "poc", "index.html"),
        "poc-offline-beacon-receiver": resolve(
          root,
          "poc",
          "offline-beacon",
          "receiver.html",
        ),
        "poc-presentation-receiver": resolve(
          root,
          "poc",
          "presentation-receiver.html",
        ),
        "s710-tool": resolve(root, "tools", "s710", "index.html"),
      },
    },
  },
});
