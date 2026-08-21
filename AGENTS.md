# Working on Widget Shell

Read `README.md`, `docs/product.md`, and `docs/architecture.md` before changing public behavior.

## Product boundary

Widget Shell is the app-agnostic runtime that makes an owned responsive application a safe, polished overlay. It complements extension build systems and application frameworks. Do not grow it into an extension bundler, backend, chat framework, page scraper, or universal arbitrary-site wrapper.

## Engineering rules

- Keep `core` framework-free and browser-global-free.
- iframe is the safe default; Shadow DOM is an explicit integration choice.
- Privileged page access must be exposed as named, validated capabilities.
- Never use evaluated remote code or grant a remote frame extension privileges.
- Mount and unmount must be idempotent and exactly reversible.
- Closed-state work must remain negligible; no polling.
- Public exports require documentation and a changeset once releases begin.
- Tests have a stringent inclusion bar: cover complex invariants with meaningful regression risk, not implementation wording or static text.
- Merge CI stays headless and targets under one minute. Chromium interaction suites run nightly.
- Preserve accessibility, reduced-motion behavior, and hostile-page isolation in every surface.

