import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "logo.png", "robots.txt", "apple-touch-icon-v3.png", "icon-512-v3.png", "icon-192-v3.png", "icon-maskable-v3.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        skipWaiting: true, // ✅ طرد النسخة القديمة فوراً
        clientsClaim: true, // ✅ السيطرة الفورية على الصفحة
        cleanupOutdatedCaches: true, // ✅ تنظيف الذاكرة القديمة
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        id: "com.talabia.app.v3", // ✅ الهوية الثابتة لمنع التكرار
        name: "طلبية | Talabia",
        short_name: "طلبية",
        description: "متجر طلبية للتسوق من متاجر كثيرة ومتنوعة بأمان وسهولة",
        theme_color: "#a30000",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        lang: "ar",
        dir: "rtl",
        scope: "/",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192-v3.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512-v3.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-maskable-v3.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable", // ✅ الأيقونة الآمنة لشاشة الترحيب
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
