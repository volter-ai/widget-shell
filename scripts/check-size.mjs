import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const budgets = [
  ["core", new URL("../dist/core.js", import.meta.url), 4_000],
  ["guest bridge", new URL("../dist/frame.js", import.meta.url), 2_500],
  ["WebExtension adapter", new URL("../dist/web-extension.js", import.meta.url), 1_000],
  ["Lucarne delivery adapter", new URL("../dist/lucarne.js", import.meta.url), 12_000],
  [
    "complete extension host",
    new URL("../examples/web-extension/dist/content.js", import.meta.url),
    12_000,
  ],
];

for (const [label, path, maximum] of budgets) {
  const compressed = gzipSync(await readFile(path)).byteLength;
  if (compressed > maximum) {
    throw new Error(`${label} is ${compressed} bytes gzipped; budget is ${maximum}`);
  }
  process.stdout.write(`${label}: ${compressed}/${maximum} bytes gzipped\n`);
}
