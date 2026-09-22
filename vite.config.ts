import { resolve } from "node:path";
import { constants } from "node:zlib";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import compression from "compression";
import { type Connect, defineConfig } from "vite";

const root = resolve(import.meta.dirname, "src");
const outDir = resolve(import.meta.dirname, "dist");

export default defineConfig({
  base: "/",
  root,
  publicDir: resolve(import.meta.dirname, "public"),
  envDir: import.meta.dirname,
  appType: "mpa",
  assetsInclude: ["**/*.pack"],
  plugins: [
    react(),
    {
      name: "preview-compression",
      // Cloudflareの配信middlewareより先に登録し、ローカルpreviewだけを圧縮する。
      configurePreviewServer(server) {
        server.middlewares.use(
          // compressionはNode HTTPにも対応するが、公開型はExpress handlerに限定される。
          compression({
            brotli: { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } },
            filter(req, res) {
              // 部分応答・media・204を変換せず、圧縮可能なtext応答だけを対象にする。
              return (
                !req.headers.range &&
                res.statusCode === 200 &&
                /^(?:text\/|application\/(?:javascript|json)|image\/svg\+xml)/i.test(
                  String(res.getHeader("Content-Type") ?? ""),
                ) &&
                compression.filter(req, res)
              );
            },
          }) as Connect.NextHandleFunction,
        );
      },
    },
    cloudflare({ configPath: "../wrangler.jsonc" }),
  ],
  worker: { format: "es" },
  build: {
    outDir,
    emptyOutDir: true,
  },
  environments: {
    client: {
      build: {
        // HTML入口はすべてブラウザーbuildだけに限定する。最上位へinputを置くと
        // Worker環境にも継承され、Vite 8／RolldownではHTMLの仮想moduleが
        // Workerのentry pointとして扱われてしまう。
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
            privacy: resolve(root, "privacy", "index.html"),
            terms: resolve(root, "terms", "index.html"),
          },
        },
      },
    },
  },
});
