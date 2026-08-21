# Contributing

Thank you for improving Widget Shell.

## Before proposing a change

Read the product boundary in `README.md` and `docs/product.md`. For substantial features or public API changes, open a proposal issue before implementation so maintainers and contributors do not duplicate work.

Security reports belong in the private process described by `SECURITY.md`.

## Development

Widget Shell requires Node.js 22 or newer.

```sh
npm ci
npm run check
npm run storybook
```

Merge checks are deliberately headless and fast. Browser interaction coverage runs in the nightly workflow.

## Pull requests

- Keep each pull request focused on one coherent outcome.
- Explain user-visible behavior, public API changes, and security implications.
- Add tests only for complex behavior likely to regress. Do not add source-text, documentation-wording, or trivial getter tests.
- Add or update Storybook stories for visible states.
- Preserve backwards compatibility unless the change has an approved migration plan.
- Confirm that you have the right to contribute the submitted code under the MIT license.

Maintainers may ask that broad changes be split. A merged contribution is not a promise that every proposed feature belongs in core; adapters and examples are often the healthier boundary.

