# Architecture

## Layers

```text
Host page
└── delivery adapter (WebExtension, embed, Lucarne)
    └── overlay host
        ├── lifecycle and geometry core
        ├── launcher and optional default chrome
        └── guest viewport (iframe by default)
            └── guest application + guest bridge
```

## Core

The core is a deterministic state machine and geometry model with no framework or browser-global dependency. It describes lifecycle, placements, viewport presets, host constraints, movement, resizing, snapping, responsive modes, and recoverable failures.

## Host

The DOM host owns mount identity, isolation, frame creation, focus, keyboard behavior, pointer interaction, persistence, global layer arbitration, animation, and exact cleanup. Storage is injected because ordinary embeds and extensions require different persistence backends.

## Guest

The guest application owns routing, authentication, data fetching, and application UI. A small guest bridge announces readiness and requests explicitly granted host capabilities.

## Capability bridge

Messages have a versioned envelope, instance identifier, request identifier, explicit type, and validated payload. The host checks source window and origin. There is no generic code execution or unrestricted DOM capability.

## Delivery adapters

- **WebExtension:** a small isolated-world content script mounts an extension-origin iframe.
- **Embed:** an ordinary script mounts the host on an owned site.
- **Lucarne:** an injection adapter serializes the mounting entry point for a controlled browser.
- **Framework adapters:** React, Preact, Vue, or Svelte integrate lifecycle without changing core semantics.

## Non-negotiable invariants

- One live host per instance identifier
- No host-page layout shift
- No page CSS dependence in iframe mode
- Stable guest viewport during ordinary content changes
- Bounded geometry inside safe viewport gutters
- Focus returns to the invoking element on close
- Reduced motion removes nonessential transitions
- Teardown leaves no owned resources behind
- Remote content never gains ambient extension authority
