# Performance contract

An overlay is present on pages where the host application's own work matters more. Widget Shell therefore treats closed-state cost and package growth as product behavior.

## Current budgets

The headless merge gate builds a real Manifest V3 content-script bundle and enforces these gzip ceilings:

| Surface | Budget |
| --- | ---: |
| Framework-free core | 4 KiB |
| Guest bridge | 2.5 KiB |
| WebExtension adapter | 1 KiB |
| Complete Lucarne delivery adapter | 12 KiB |
| Complete extension host, excluding the guest app | 12 KiB |

The `0.3.0` adoption-layer build measures approximately 3.5 KiB for core, 2 KiB for the guest bridge, 0.7 KiB for the WebExtension adapter, 11.6 KiB for the self-contained Lucarne delivery adapter, and 10.4 KiB for the complete extension host. Budgets are ceilings, not targets to fill.

## Runtime rules

- The collapsed shell does not create the guest iframe until first open unless preloading is explicit.
- There is no polling.
- Host resize uses one window listener; drag and resize use one shared pointer path.
- Guest content does not trigger shell resizing unless the host opts into bounded content fitting.
- Pointer interaction temporarily disables iframe hit testing instead of installing page overlays.
- Geometry is saved only after an interaction or explicit controller update, not on every pointer movement.
- Closing preserves the loaded guest for continuity; destroying removes all owned listeners, nodes, timers, and registry entries.

Chromium interaction coverage belongs in the nightly workflow. Merge CI remains headless and under one minute.
