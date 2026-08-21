# WXT example

This is a complete WXT project: the content script owns the shell, the iframe is an extension-local HTML entry point, and WXT's invalidation context destroys the overlay during development reloads.

```sh
npm install
npm install --no-save @volter-ai-dev/widget-shell
npm run build
npm run build:firefox
```

Inside this repository, install a tarball from `npm pack ../..` instead. The nightly job uses that release-shaped path so local source dependencies cannot leak into the example lockfile.

Load `.output/chrome-mv3` or `.output/firefox-mv3` as an unpacked extension and visit `https://example.com/`.
