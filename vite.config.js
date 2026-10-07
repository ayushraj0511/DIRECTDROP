import { defineConfig } from "vite";

export default defineConfig({
  root: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5173,

allowedHosts: true,

    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/peerjs": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true
      }
    }
  }
});
