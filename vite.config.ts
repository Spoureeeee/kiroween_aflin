import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    target: "es2022",
  },
  test: {
    // Vitest config embedded here so we don't need a separate vitest.config.ts.
    include: ["src/**/*.test.ts"],
    // No DOM needed for parse/ tests.
    environment: "node",
  },
});
