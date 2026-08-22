# Widget Shell

[![CI](https://github.com/volter-ai/widget-shell/actions/workflows/ci.yml/badge.svg)](https://github.com/volter-ai/widget-shell/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=nodedotjs)](package.json)
[![Storybook](https://img.shields.io/badge/Storybook-live-ff4785?logo=storybook&logoColor=white)](https://volter-ai.github.io/widget-shell/)

**The application runtime for overlays.** Turn an existing responsive web app into a polished in-page widget or browser extension without rebuilding the app.

> Bring your app. Widget Shell makes it safely and convincingly present over another app.

Widget Shell supplies the difficult reusable layer between extension tooling and application UI: isolation, lifecycle, responsive viewport geometry, launchers, focus, accessibility, persistence, loading and recovery, and a capability-based page bridge.

## Why Widget Shell?

Extension frameworks answer _how to build and inject an extension component_. Chat widgets provide a polished shell for one company's messenger. Positioning libraries decide where an element belongs.

Widget Shell answers a different question: **how does an existing application become an excellent overlay product?**

- Bring any owned, mobile-responsive, embeddable application.
- Use one guest application across a floating phone, compact widget, sheet, side panel, full screen, or Lucarne-injected surface.
- Default to a strongly isolated iframe with a stable responsive viewport.
- Grant page access through explicit, validated capabilities rather than unrestricted DOM access.
- Ship the default experience or replace its launcher, chrome, transport, persistence, styles, and framework adapters independently.

## Status

Widget Shell is in initial development. The `0.x` public contracts are usable but may evolve between minor releases; changes are documented in the changelog.

## API

```ts
import { createOverlay } from "@volter-ai-dev/widget-shell";

const overlay = createOverlay({
  id: "acme-support",
  content: {
    kind: "iframe",
    src: browser.runtime.getURL("/app.html"),
  },
  viewport: "mobile-sm",
  placement: "bottom-end",
  launcher: {
    icon: "/icon.svg",
    label: "Open Acme",
  },
});

overlay.mount();
```

The default preset gives the guest a stable `390 × 667` CSS-pixel viewport. Its collapsed launcher is transparent and unbranded; setting `theme.accent` opts into a filled treatment. It can be dragged, resized, snapped, and persisted while floating; smaller hosts progressively switch it into sheet and full-screen modes. See the [API guide](docs/api.md).

Applications that need more than a responsive phone can declare presentation policies. Physical footprint and logical guest viewport are independent: a guest can explicitly request a bounded content-fit surface, or keep a real `390 × 844` layout viewport while the shell scales it into a smaller footprint. Named states let one application move between peek, panel, simulated-device, sheet, and full-screen presentations without receiving arbitrary page authority.

## Design principles

1. **Bring your own app.** The guest owns its routing, authentication, data, and application state.
2. **Safe by default.** iframe isolation, strict origins, narrow capabilities, and no evaluated remote code.
3. **Progressive adoption.** Use the finished shell, a framework adapter, or only the framework-free primitives.
4. **Stable, explicit geometry.** Responsive viewports stay stable; content fitting and virtual scaling happen only through declared presentation policies.
5. **Exact cleanup.** Unmounting restores the host page without leaked nodes, listeners, observers, timers, or URLs.
6. **Fast while closed.** The collapsed launcher is tiny and the guest is lazy by default.
7. **Accessible as infrastructure.** Focus, keyboard, motion, contrast, labels, and reading order are core behavior.
8. **Integrate; do not replace.** WXT, Plasmo, Extension.js, Vite, and application frameworks remain first-class peers.

## Scope

Widget Shell includes overlay lifecycle, geometry, iframe and Shadow DOM hosts, a guest bridge, default chrome, style tokens, and delivery adapters.

It is not an extension build system, application framework, backend, chat framework, page-scraping toolkit, or universal wrapper for third-party websites. See [the product contract](docs/product.md) and [architecture](docs/architecture.md).

The project also publishes an enforced [performance contract](docs/performance.md); the complete extension host currently ships at approximately 7 KiB gzip before the guest application.

Use the [extension integration guide](docs/extensions.md) for raw Manifest V3, WXT, and Plasmo projects. The framework examples are built nightly with their real toolchains while the merge gate remains headless and fast.

## Contributing

We welcome bug reports, design feedback, documentation fixes, adapters, and focused implementation contributions. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Security issues must follow [SECURITY.md](SECURITY.md), not the public issue tracker.

Explore every supported visual state in the [live Storybook](https://volter-ai.github.io/widget-shell/).

## Community

- [Support and questions](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Governance](GOVERNANCE.md)
- [Roadmap](ROADMAP.md)

## License

[MIT](LICENSE) © Volter AI.
