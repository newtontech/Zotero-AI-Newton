import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "docs-src"),
  build: {
    outDir: resolve(__dirname, "docs"),
    emptyOutDir: true,
    assetsDir: "assets",
  },
  base: "./",
  publicDir: resolve(__dirname, "docs-src/public"),
});
