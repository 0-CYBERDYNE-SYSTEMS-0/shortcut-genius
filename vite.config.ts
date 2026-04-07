import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
// The TAURI_DEV_HOST env var is set by `tauri dev` when using a remote device.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      db: path.resolve(__dirname, "db"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Tauri uses ES modules; reduce chunk size for faster loads.
    target: ["es2021", "chrome105", "safari13"],
  },
  // Prevent Vite from clearing the terminal so Tauri log output remains visible.
  clearScreen: false,
  server: {
    host: host ?? false,
    port: 5173,
    strictPort: false,
    // Make HMR work when running behind Tauri's remote-device tunnel.
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5183,
        }
      : undefined,
    watch: {
      // On Windows Tauri uses polling for file watching.
      usePolling: !!process.env.TAURI_DEV_HOST,
    },
  },
});
