// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const appBuildId = new Date().toISOString();

function appVersionPlugin() {
  const body = JSON.stringify({ id: appBuildId });
  return {
    name: "app-version",
    transform(code: string, id: string) {
      if (!id.includes("app-update-banner")) return;
      return code.replaceAll("__APP_BUILD_ID__", JSON.stringify(appBuildId));
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/version.json") {
          next();
          return;
        }
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json");
        res.end(body);
      });
    },
    generateBundle(this: { emitFile: (file: { type: "asset"; fileName: string; source: string }) => void }) {
      this.emitFile({ type: "asset", fileName: "version.json", source: body });
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// Nitro builds the SSR output Vercel needs to serve "/" and client-side routes.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [appVersionPlugin(), nitro()],
  },
});
