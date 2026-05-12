import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";


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
