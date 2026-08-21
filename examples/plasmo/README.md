# Plasmo example

This is a complete Plasmo project. A plain content script owns Widget Shell's already-isolated host, while a Plasmo tab page supplies the extension-local responsive application. The singleton guard gives development reinjection an exact teardown path without adding a redundant Plasmo CSUI wrapper.

```sh
npm install
npm install --no-save @volter-ai-dev/widget-shell
npm run build
```

Inside this repository, install a tarball from `npm pack ../..` instead. The nightly job uses that release-shaped path so local source dependencies cannot leak into the example lockfile.

Load `build/chrome-mv3-prod` as an unpacked extension and visit `https://example.com/`.

Plasmo 0.90.5 currently brings legacy Parcel advisories into its development-only build tree. They do not enter the extension runtime: `npm audit --omit=dev` is clean. Its legacy graph also produces platform-dependent npm 10 lock resolution, so nightly resolves the pinned manifest with `--package-lock=false` instead of presenting `npm ci` as cross-platform evidence. The compatibility job records both boundaries while Dependabot tracks the example independently.
