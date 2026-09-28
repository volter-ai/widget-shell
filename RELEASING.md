# Releasing

Every push to `main` is released: the `publish` workflow moves the package to its next patch version, checks lint, types and the build, publishes with provenance, and commits the version back to `main`.

For a minor or major release, set that version in `package.json` (and `package-lock.json`) yourself, with the `CHANGELOG.md` entries and migrations; the workflow publishes a version npm does not have as it is.

The workflow publishes with the repository's `NPM_TOKEN` secret. Releases do not block continued development on `main`.
