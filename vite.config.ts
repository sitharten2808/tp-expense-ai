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
//
// `firebase-admin` and its gRPC/google-auth chain are CJS packages that rely on
// `__dirname`. Nitro's default rolldown bundling rewrites them into `_libs/*.mjs`
// where `__dirname` is undefined, producing a runtime ReferenceError on Vercel.
// Forcing a "full trace" (the `*` suffix) makes Nitro copy the original package
// files into `.output/server/node_modules/...` and load them via `require()`,
// which preserves CJS semantics (and `__dirname`).
export default defineConfig({
  cloudflare: false,
  plugins: [
    nitro({
      external: [
        "firebase-admin",
        "@google-cloud/firestore",
        "@grpc/grpc-js",
        "@grpc/proto-loader",
        "google-gax",
        "google-auth-library",
        "gaxios",
        "gtoken",
        "protobufjs",
        "long",
      ],
      rollupConfig: {
        output: {
          format: "esm",
        },
      },
    }),
  ],
});
