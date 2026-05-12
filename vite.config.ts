// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Deploy target: Vercel. We disable the Cloudflare plugin that the Lovable wrapper
// enables by default and add Nitro instead — Vercel auto-detects TanStack Start + Nitro
// and selects the vercel preset on its build infrastructure.
export default defineConfig({
  cloudflare: false,
  plugins: [nitro()],
});
