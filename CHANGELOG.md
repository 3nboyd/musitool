# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Public repository contribution guidance, security policy, architecture documentation, CI, issue templates, and automated dependency updates.

### Changed

- Updated Next.js, jsPDF, Vitest, Tailwind CSS, Dexie, Zustand, and supporting development packages.
- Standardized the public product name as ImproviBuddy while retaining the historical repository name.

### Security

- Updated direct production dependencies to remove all known production audit findings reported during packaging.

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
