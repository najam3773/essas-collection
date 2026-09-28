import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";

export default defineConfig({
  plugins: [
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  // Do not proxy /api here. Migrated Route Handlers must be reachable on vinext.
  // Express remains on http://127.0.0.1:4000 for direct fallback testing.
  // Unmigrated /api paths are rewritten to Express via next.config.ts when
  // STOREFRONT_API=workers.
  server: {
    proxy: {
      "/health": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
