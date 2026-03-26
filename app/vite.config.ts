import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".mts", ".jsx", ".json"],
    alias: {
      "@thesis/core-engine": resolve(__dirname, "../core-engine/src/index.ts"),
      "@thesis/game-system": resolve(__dirname, "../game-system/src/index.ts"),
      "@thesis/storage": resolve(__dirname, "../storage/src/index.ts"),
      "@thesis/ui-editor": resolve(__dirname, "../ui-editor/src/index.tsx")
    }
  }
});
