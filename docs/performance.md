# Performance contract

An overlay is present on pages where the host application's own work matters more. Widget Shell therefore treats closed-state cost and package growth as product behavior.

## Current budgets

The headless merge gate builds a real Manifest V3 content-script bundle and enforces these gzip ceilings:

| Surface | Budget |
| --- | ---: |
| Framework-free core | 2.5 KiB |
| Guest bridge | 2 KiB |
| WebExtension adapter | 1 KiB |
| Complete extension host, excluding the guest app | 10 KiB |

The adoption-layer build measures approximately 1.8 KiB for core, 1.4 KiB for the guest bridge, 0.7 KiB for the WebExtension adapter, and 7 KiB for the complete host. Budgets are ceilings, not targets to fill.

## Runtime rules

- The collapsed shell does not create the guest iframe until first open unless preloading is explicit.
- There is no polling.
- Host resize uses one window listener; drag and resize use one shared pointer path.
- Guest content does not trigger shell resizing.
- Pointer interaction temporarily disables iframe hit testing instead of installing page overlays.
- Geometry is saved only after an interaction or explicit controller update, not on every pointer movement.
- Closing preserves the loaded guest for continuity; destroying removes all owned listeners, nodes, timers, and registry entries.

Chromium interaction coverage belongs in the nightly workflow. Merge CI remains headless and under one minute.
