import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps the bundled server entry with SSR error handling.
      server: { entry: "server" },
      // Keep server-only modules out of the client bundle.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Server build (and `vite preview` of it). Production target is Vercel.
    // Override with NITRO_PRESET (e.g. NITRO_PRESET=node-server) for a local Node server.
    ...(command === "build" || isPreview ? [nitro({ defaultPreset: "vercel" })] : []),
    viteReact(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  css: { transformer: "lightningcss" },
  server: { host: "::", port: 8080 },
}));
