<p align="center">
  <img src="public/improvibuddy-logo.svg" width="360" alt="ImproviBuddy logo">
</p>

# ImproviBuddy

[![CI](https://github.com/3nboyd/musitool/actions/workflows/ci.yml/badge.svg)](https://github.com/3nboyd/musitool/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)

ImproviBuddy is a local-first music analysis and improvisation workspace that runs in the browser. The repository retains the historical `musitool` name.

## Features

- Live microphone or audio-file analysis
- Oscilloscope and spectrum visualizations
- Pitch, note, confidence, tuner cents, and BPM estimates
- Key, scale, and chord hypotheses with ranked theory recommendations
- Editable form sheet and compressed 32-bar form view
- Advanced metronome with accents, subdivisions, swing, count-in, and tap tempo
- Web MIDI input, event monitoring, synth playback, recording, replay, and quantization
- Local session persistence with IndexedDB
- Session import and export, including chart-oriented PDF output
- Responsive pixel-art studio interface with the ImproviBuddy mascot

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS
- Zustand for application state
- Dexie and IndexedDB for local persistence
- Web Audio API, Web MIDI API, Pitchy, Meyda, and Tonal
- Vitest and Testing Library

## Requirements

- Node.js 22 or later
- npm 11 or later
- A modern desktop browser
- HTTPS or `localhost` for microphone and MIDI permissions

## Quick start

```bash
git clone https://github.com/3nboyd/musitool.git
cd musitool
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The test suite covers note conversion, metronome timing, MIDI quantization, IndexedDB persistence, form compression, and theory recommendations.

## Privacy and data

Audio analysis, theory inference, MIDI processing, and session storage run locally in the browser. The application has no account system, analytics service, advertising SDK, or application database server. Saved sessions stay in the browser's IndexedDB unless the user exports them.

Browser permissions remain under the user's control. Clearing site data removes locally saved sessions, so export important work before clearing browser storage.

## Browser support

Chrome and Edge provide the broadest support, including Web MIDI. Firefox and Safari support the main audio and theory workflows, but MIDI availability depends on the browser and operating system.

## Project structure

```text
src/
├── app/                 Next.js route and global styles
├── components/studio/   Studio panels, visualizations, and app shell
├── hooks/               Audio, MIDI, metronome, and worker integration
├── lib/                 Analysis, theory, storage, and formatting logic
├── store/               Zustand application state
├── types/               Shared domain types
└── workers/             Background theory analysis
```

See [Architecture](docs/ARCHITECTURE.md) for the runtime data flow and module boundaries.

## Production deployment

The application can run on any host that supports a Next.js production build. For Vercel:

1. Import `3nboyd/musitool`.
2. Keep the detected Next.js defaults.
3. Deploy without environment variables.

Microphone access requires HTTPS outside `localhost`. No backend or external database is required.

## Current limitations

- No cloud sync or user accounts
- No real-time collaboration links
- No SoundFont import pipeline
- No full DAW project export

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Report sensitive security or privacy concerns using [SECURITY.md](SECURITY.md).

## License

ImproviBuddy is available under the [MIT License](LICENSE).
