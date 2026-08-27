import { resolve } from "node:path";
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
  plugins: [react()],
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
        privacy: resolve(root, "privacy", "index.html"),
        terms: resolve(root, "terms", "index.html"),
      },
    },
  },
});
