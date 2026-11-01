import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "我的记事本",
        short_name: "我的记事本",
        description: "一个安静的私人日记本。内容仅保存在当前浏览器。",
        lang: "zh-CN",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#28734d",
        background_color: "#e6f1e9",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cacheId: "simple-diary",
        globPatterns: ["**/*.{js,css,html}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/version\.json$/, /^\/api\//],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
    }),
  ],
});
