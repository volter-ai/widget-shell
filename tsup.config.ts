import { buildSync } from "esbuild";
import { defineConfig } from "tsup";

const pageRuntime = buildSync({
  entryPoints: ["src/cdp/page-runtime.ts"],
  bundle: true,
  format: "iife",
  minify: true,
  platform: "browser",
  target: "es2022",
  write: false,
}).outputFiles?.[0]?.text;

if (!pageRuntime) throw new Error("Could not build the CDP page runtime");

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core.ts",
    frame: "src/frame.ts",
    cdp: "src/cdp.ts",
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
    __WIDGET_SHELL_PAGE_RUNTIME__: JSON.stringify(pageRuntime),
  },
});
