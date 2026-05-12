import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  vite: {
    ssr: {
      // Tell the bundler to leave these CJS packages completely alone.
      // Vercel will install them natively via node_modules instead of 
      // trying to compile them into the final .mjs server bundle.
      external: [
        "firebase-admin",
        "@google-cloud/firestore",
        "@grpc/grpc-js",
        "@grpc/proto-loader",
        "google-gax",
        "google-auth-library",
      ],
    },
  },
});