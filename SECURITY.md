# Security policy

## Supported versions

The latest revision of `main` is the only supported development version.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for sensitive issues. Do not open a public issue that includes exploit details, recordings, MIDI data, exported sessions, or other personal content.

Include the affected revision, browser and operating system, reproduction steps, impact, and suggested mitigation when available. Issues involving file import, PDF export, browser storage, microphone access, MIDI permissions, or worker messages are especially helpful.

## Dependency policy

Production dependencies are checked in CI with `npm audit --omit=dev`. Automated dependency pull requests are enabled. Development-only audit findings are evaluated separately because automated major downgrades can create larger compatibility and security risks.
