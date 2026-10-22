# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Maintenance

- Updated source-map-js to 1.2.2 to address GHSA-68fv-2mgg-jv7q; the production dependency audit reports no vulnerabilities.
- Clarified audio-analysis terms, browser permissions, session backups, and production setup.
- Verified lint, TypeScript checks, 18 tests, and the production build; checked local session saving and persistence after reload.

### Added

- Public repository contribution guidance, security policy, architecture documentation, CI, issue templates, and automated dependency updates.

### Changed

- Updated Next.js, jsPDF, Vitest, Tailwind CSS, Dexie, Zustand, and supporting development packages.
- Standardized MusiTool branding across the application, documentation, and project assets.

### Security

- Updated direct production dependencies to remove all known production audit findings reported during packaging.

### Fixed

- Pinned npm 11 in CI so clean installs use the same lockfile implementation as local development.

## [0.1.0] - 2026-02-15

### Added

- Bootstrapped Next.js + TypeScript + Tailwind app for MusiTool.
- Implemented live audio analysis with waveform and spectrum canvases.
- Added pitch, note, cents tuning, confidence, and BPM estimation.
- Added theory assistant with key/scale/chord hypotheses and recommendation ranking.
- Added circle-of-fifths mini view.
- Implemented advanced metronome (subdivisions, swing, accents, count-in, tap tempo).
- Added Web MIDI connect, live input stream, synth playback, phrase recording/replay.
- Added MIDI quantization utilities.
- Added local persistence via IndexedDB (Dexie), session save/load/delete, JSON import/export.
- Added Vitest unit/integration tests and test setup.
- Added MIT license and release-ready README.

### Tooling

- Added lint, typecheck, test, and build scripts.
- Added Vitest config and testing dependencies.
