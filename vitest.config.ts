import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // crypto.ts derives its key from this; a throwaway value is fine for tests.
    env: { STORE_TOKEN_ENC_KEY: "test-key-not-for-production-use-only" },
  },
});
