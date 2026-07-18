import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "monaco";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "charts";
          }

          if (id.includes("node_modules/framer-motion")) {
            return "animation";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }

          if (
            id.includes("node_modules/@tanstack") ||
            id.includes("node_modules/axios") ||
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/zod")
          ) {
            return "app-vendor";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
  },
});
