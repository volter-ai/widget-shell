import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(root, "examples/web-extension");
const output = resolve(example, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  build({
    entryPoints: [resolve(example, "content.ts")],
    outfile: resolve(output, "content.js"),
    bundle: true,
    format: "iife",
    target: "chrome120",
    minify: true,
  }),
  build({
    entryPoints: [resolve(example, "app.ts")],
    outfile: resolve(output, "app.js"),
    bundle: true,
    format: "iife",
    target: "chrome120",
    minify: true,
  }),
  cp(resolve(example, "manifest.json"), resolve(output, "manifest.json")),
  cp(resolve(example, "app.html"), resolve(output, "app.html")),
]);
