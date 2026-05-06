import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "TownIntegrate",
        short_name: "Town",
        description: "Plataforma de gestão TownIntegrate",
        theme_color: "#407b75",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          { src: "/icons/icon-72.png",   sizes: "72x72",   type: "image/png" },
          { src: "/icons/icon-96.png",   sizes: "96x96",   type: "image/png" },
          { src: "/icons/icon-128.png",  sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144.png",  sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152.png",  sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192.png",  sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-384.png",  sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512.png",  sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png",  sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Faz cache dos assets estáticos do build (exclui imagens pesadas do precache)
        globPatterns: ["**/*.{js,css,html,ico,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
        // Não cacheia chamadas de API — sempre vai ao servidor
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Requisições de API: Network First (tenta rede, fallback cache curto)
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 min
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Uploads / imagens do servidor
            urlPattern: /\/uploads\//,
            handler: "CacheFirst",
            options: {
              cacheName: "uploads-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Ativa o SW em desenvolvimento para testar
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
