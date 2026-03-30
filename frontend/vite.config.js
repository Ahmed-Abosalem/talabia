import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "logo.png", "robots.txt", "apple-touch-icon.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: "طلبية | Talabia",
        short_name: "طلبية",
        description: "متجر طلبية للتسوق من متاجر كثيرة ومتنوعة بأمان وسهولة",
        theme_color: "#a30000",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        lang: "ar",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // يسمح بالوصول من الهاتف على نفس الشبكة
    proxy: {
      // تمرير طلبات الـ API إلى الباكند المحلي على الكمبيوتر
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // تمرير الصور/الملفات من uploads
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'axios']
        }
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
  }
});
