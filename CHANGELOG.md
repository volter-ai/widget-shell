# Changelog

## Unreleased

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
