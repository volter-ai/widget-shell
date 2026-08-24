# Changelog

## Unreleased

- Replaced the permanent bottom-right resize grip with invisible hit targets on all four corners,
  preserving opposite-corner anchoring and keyboard access.
- Added semantic `attention` and `neutral` launcher badge tones so informational counts do not
  masquerade as urgent notifications.

## 0.3.2 - 2026-08-24

- Preserved every Widget Shell theme token through Lucarne delivery, including transparent surfaces,
  instead of narrowing remote overlays to accent and radius.

## 0.3.1 - 2026-08-23

- Kept persisted geometry independent for each named presentation so one mode cannot restore another mode's dimensions.

## 0.3.0 - 2026-08-22

- Added framework-free presentation policies that separate physical footprint from responsive or virtual guest viewports.
- Added bounded content-fit negotiation, named guest-selectable presentation states, minimum readable scale fallback, and observable resolved presentation snapshots.
- Passed presentation policies through the Lucarne adapter and made its replacement identity include shell configuration as well as guest HTML.
- Added a Storybook Geometry Lab for responsive, content-fit, virtual, constrained-scale, and guest-selected states.

## 0.2.3 - 2026-08-21

- Made the collapsed launcher transparent by default; setting `theme.accent` still opts into the filled treatment.

## 0.2.2 - 2026-08-21

- Made the unbranded default monochrome rather than assigning it a product color; integrators can still opt into any accent through the existing theme token.

## 0.2.1 - 2026-08-21

- Changed the unbranded default accent from purple to a neutral system blue; integrators can still replace it through the existing theme token.

## 0.2.0 - 2026-08-21

- Let an origin-validated iframe guest atomically update its own launcher metadata and subscribe to outer-shell visibility.
- Accept the browser-reported ancestor origin when extension iframe referrers are intentionally omitted.

## 0.1.0 - 2026-08-21

- Established the framework-free lifecycle, geometry, and bridge protocol.
- Added the isolated iframe host, default mobile shell, and guest SDK.
- Added pointer and keyboard movement, resizing, edge snapping, responsive sheet/full-screen modes, and validated async geometry persistence.
- Added exclusive or independent coordination across multiple overlays.
- Added theme tokens and application-owned launcher, loading, and error surfaces.
- Added Storybook and a narrowly permissioned Manifest V3 extension example.
- Added a shared WebExtension origin/storage adapter and complete WXT and Plasmo example projects.
- Added nightly real-toolchain compatibility builds without adding framework cost to merge CI.
