# Releasing

Releases are ordinary GitHub Releases and publish to npm in a separate background workflow with provenance.

1. Update `package.json` according to semantic versioning.
2. Move relevant entries into `CHANGELOG.md` and document migrations.
3. Commit the release preparation to `main`.
4. Create and publish a GitHub Release tagged `v<package version>`.
5. The release workflow checks lint, types and the build, verifies the tag, and publishes with npm provenance.

The workflow publishes with the repository's `NPM_TOKEN` secret, the npm publish token Volter's other packages use. The protected GitHub `npm` environment should permit only the `main` branch. Releases do not block continued development on `main`.

