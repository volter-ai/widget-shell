# Product contract

## Promise

If an owned application works well in a small mobile viewport, Widget Shell can make it a secure, polished overlay extension without requiring a second application UI.

## Users

- SaaS teams extending an existing product across browser workflows
- AI assistants, customer support, CRM, knowledge, accessibility, QA, and internal-tool products
- Extension developers who need finished overlay behavior
- Design-system teams consuming only lifecycle, geometry, bridge, or accessibility primitives
- Browser-control systems injecting the same surface outside a normal extension

## Product surfaces

The same guest application can appear as a floating phone, compact messenger, anchored popover, side sheet, side panel, full-screen overlay, detached window, inline embed, or remotely injected interface.

`mobile-sm` is the default floating viewport: `390 × 667` CSS pixels, constrained by the available host viewport. A smaller host progressively turns the floating window into a sheet and then a full-screen surface.

## Owned-app boundary

“Bring any app” means any application the integrator is authorized to embed and that can support the selected delivery mode. Widget Shell does not bypass `frame-ancestors`, `X-Frame-Options`, authentication partitioning, browser permissions, or extension-store policy.

Privileged extension logic is bundled. Remotely hosted content remains ordinary web content and receives no implicit extension privileges.

## Differentiation

Widget Shell combines capabilities that exist only separately elsewhere:

- a stable responsive application viewport rather than content-height resizing;
- a complete launcher and overlay-window lifecycle rather than mount-only injection;
- iframe isolation plus a narrow capability bridge rather than direct ambient page access;
- interchangeable extension, embed, and browser-control delivery adapters;
- polished defaults plus independently consumable, framework-free primitives.

## Success criteria

An unrelated team can wrap its existing mobile web app, create a branded overlay extension in an afternoon, and encounter no assumptions about Volter products. An expert team can replace every visual surface while retaining the behavioral invariants.

