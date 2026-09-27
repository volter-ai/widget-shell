# Releasing

A release is a version on `main` that npm does not have yet; the `publish` workflow publishes it in the background with provenance.

1. Update `package.json` (and `package-lock.json`) according to semantic versioning.
2. Move relevant entries into `CHANGELOG.md` and document migrations.
3. Commit the release to `main`. The workflow checks lint, types and the build, then publishes.

The workflow publishes with the repository's `NPM_TOKEN` secret. Releases do not block continued development on `main`.
