# Governance

Widget Shell is an open-source Volter AI project maintained in public.

## Decision making

Maintainers seek consensus in issues and pull requests. The project lead is the final decision maker when consensus cannot be reached, with decisions explained against the product contract, security model, compatibility obligations, and maintenance cost.

## Maintainers

Maintainers may triage issues, review and merge changes, publish releases, and handle security reports. New maintainers are invited based on sustained, constructive contributions and demonstrated judgment across product and engineering boundaries.

## Compatibility

Before `1.0`, breaking changes require release notes and a reasonable migration path. At `1.0`, public exports follow semantic versioning. Experimental APIs are explicitly marked and receive no compatibility guarantee.

## Vendor neutrality

Core APIs must not assume a Volter product, UI framework, extension framework, backend, or agent protocol. Product-specific integrations belong in adapters or examples.

