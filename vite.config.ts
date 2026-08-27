import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = resolve(import.meta.dirname, "src");
const outDir = resolve(import.meta.dirname, "dist");

export default defineConfig({
  base: "/",
  root,
  publicDir: resolve(import.meta.dirname, "public"),
  envDir: import.meta.dirname,
  appType: "mpa",
  assetsInclude: ["**/*.pack"],
  plugins: [react(), cloudflare({ configPath: "../wrangler.jsonc" })],
  worker: { format: "es" },
  build: {
    outDir,
    emptyOutDir: true,
  },
  environments: {
    client: {
      build: {
        // Scope every HTML entry to the browser build. A top-level input is
        // inherited by the Worker environment and makes HTML virtual modules
        // look like Worker entry points under Vite 8/Rolldown.
        rollupOptions: {
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
