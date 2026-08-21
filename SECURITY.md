# Security policy

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting for `volter-ai/widget-shell`:

<https://github.com/volter-ai/widget-shell/security/advisories/new>

Include affected versions, delivery mode, reproduction steps, impact, and any suggested mitigation. We will acknowledge a complete report within three business days and coordinate disclosure after a fix is available.

## Security model

Widget Shell crosses a security boundary between a host page, extension code, and a guest application. Reports involving origin confusion, capability escalation, message spoofing, frame navigation, unintended page access, credential exposure, or cleanup failures are especially important.

Only the latest released minor line receives security fixes before `1.0`. After `1.0`, supported versions will be documented here.

