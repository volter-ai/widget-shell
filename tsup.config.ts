import { buildSync } from "esbuild";
import { defineConfig } from "tsup";

const lucarneRuntime = buildSync({
  entryPoints: ["src/adapters/lucarne-injected.ts"],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2022",
  write: false,
}).outputFiles?.[0]?.text;

if (!lucarneRuntime) throw new Error("Could not build the Lucarne delivery runtime");

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core.ts",
    frame: "src/frame.ts",
    lucarne: "src/lucarne.ts",
    "web-extension": "src/web-extension.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  define: {
    __LUCARNE_RUNTIME_SOURCE__: JSON.stringify(lucarneRuntime),
  },
});
