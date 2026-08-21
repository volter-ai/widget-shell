# Releasing

Releases are ordinary GitHub Releases and publish to npm in a separate background workflow with provenance.

1. Update `package.json` according to semantic versioning.
2. Move relevant entries into `CHANGELOG.md` and document migrations.
3. Merge the release preparation through the normal review and CI path.
4. Create and publish a GitHub Release tagged `v<package version>`.
5. The release workflow verifies the tag, reruns the headless gate, and publishes with npm provenance.

The npm package must configure this repository's `release.yml` environment as a trusted publisher. The protected GitHub `npm` environment should permit only the `main` branch. Releases do not block continued development on `main`.

