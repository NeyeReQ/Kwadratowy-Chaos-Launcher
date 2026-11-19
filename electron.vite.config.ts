import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { outDir: "out/main" } },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
          inlineDynamicImports: true
        }
      }
    }
  },
  renderer: {
    root: resolve("src/renderer"),
    base: "./",
    plugins: [react()],
    resolve: { alias: { "@shared": resolve("src/shared") } },
    build: { outDir: resolve("out/renderer"), emptyOutDir: true }
  }
});