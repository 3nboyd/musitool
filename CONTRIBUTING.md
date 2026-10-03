# Contributing

Thank you for helping improve ImproviBuddy.

## Development workflow

1. Create a focused branch from `main`.
2. Install the locked dependencies with `npm ci`.
3. Make the smallest coherent change.
4. Add or update tests for behavior changes.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
6. Update the README, architecture guide, and changelog when applicable.

## Pull requests

Describe the musician workflow being improved, the browsers tested, and any effect on microphone, MIDI, timing, storage, workers, or exported files. Include screenshots or a short recording for visual changes.

Keep browser-only modules behind client boundaries. Do not introduce remote analytics, tracking, or data uploads without a documented privacy review and explicit user consent.

By contributing, you agree that your contribution is licensed under this repository's MIT License.
