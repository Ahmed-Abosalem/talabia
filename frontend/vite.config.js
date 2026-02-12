import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
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
});
