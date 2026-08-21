# WXT example

This is a complete WXT project: the content script owns the shell, the iframe is an extension-local HTML entry point, and WXT's invalidation context destroys the overlay during development reloads.

```sh
npm install
npm run build
npm run build:firefox
```

Load `.output/chrome-mv3` or `.output/firefox-mv3` as an unpacked extension and visit `https://example.com/`.

