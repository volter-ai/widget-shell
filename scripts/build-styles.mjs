import { readFileSync, writeFileSync } from "node:fs";
import { brandResolver } from "./brand-roles.mjs";

// src/styles.generated.ts is generated from src/styles.css: colours and shadows
// are the Volter brand's roles, written as `brand(<role>)` and resolved at
// build (./brand-roles.mjs). The output is committed; nothing fetches the
// brand at runtime.
const brand = await brandResolver("build-styles");
const source = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
// The source's header says where the output goes; the output carries its own.
const css = brand.resolve(source.replace(/^\/\*[\s\S]*?\*\/\n/, ""));
brand.finish();
const literal = css.replace(/[\\`]|\$\{/g, (match) => `\\${match}`);
writeFileSync(
  new URL("../src/styles.generated.ts", import.meta.url),
  `// Generated from src/styles.css by scripts/build-styles.mjs. Edit that file.\nexport const SHELL_STYLES = \`\n${literal}\`;\n`,
);
console.log("src/styles.generated.ts written");
