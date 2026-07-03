import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "node18",
  splitting: false,
  publicDir: false,
  shims: true,
  loader: {
    ".bin": "copy",
  },
  onSuccess: async () => {
    const { cpSync, existsSync } = await import("node:fs");
    if (existsSync("generated/data")) {
      cpSync("generated/data", "dist/data", { recursive: true });
    }
  },
});
