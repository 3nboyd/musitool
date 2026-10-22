<p align="center">
  <img src="public/musitool-logo.svg" width="360" alt="MusiTool logo">
</p>

# MusiTool

[![CI](https://github.com/3nboyd/musitool/actions/workflows/ci.yml/badge.svg)](https://github.com/3nboyd/musitool/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)

MusiTool is a local-first music analysis and improvisation workspace that runs in the browser.

## Features

- Live microphone or audio-file analysis
- Oscilloscope and spectrum visualizations
- Pitch and note estimates, tuning offset in cents, analysis confidence, and tempo (BPM)
- Suggested keys, scales, and chords, ranked by how well they fit the input
- Editable form sheet and compressed 32-bar form view
- Advanced metronome with accents, subdivisions, swing, count-in, and tap tempo
- Web MIDI input, event monitoring, synth playback, recording, replay, and snapping recorded notes to a timing grid
- Local session persistence with IndexedDB
- Session import and export, including chart-oriented PDF output
- Responsive pixel-art studio interface with the MusiTool mascot

## Requirements

- Node.js 22 or later
- npm 11 or later
- A modern desktop browser

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

Use **Export JSON** in the session panel to save a backup. To restore it in this or another browser, choose **Import JSON** and select the saved file. Export important sessions before clearing site data, which removes browser-stored sessions. Browser permissions remain under your control.

## Browser support

Run the app on `localhost` or an HTTPS site, then grant microphone or MIDI access when you use those tools. Plain HTTP on another host does not provide the secure context these permissions require.

Chrome and Edge provide the broadest support, including Web MIDI. Firefox and Safari support the main audio and theory workflows; MIDI availability depends on the browser and operating system. You can also analyze an audio file without granting microphone access.

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS
- Zustand for application state
- Dexie and IndexedDB for local persistence
- Web Audio API, Web MIDI API, Pitchy, Meyda, and Tonal
- Vitest and Testing Library

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

To run a production build locally:

```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). The application can also run on any host that supports a Next.js production build. For Vercel:

1. Import `3nboyd/musitool`.
2. Keep the detected Next.js defaults.
3. Deploy without environment variables.

No backend or external database is required. See [Browser support](#browser-support) for microphone and MIDI setup.

## Workspace scope

MusiTool brings audio analysis, practice tools, and session storage together in one browser workspace. Export sessions as JSON to back them up or move them between browsers.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Report sensitive security or privacy concerns using [SECURITY.md](SECURITY.md).

## License

MusiTool is available under the [MIT License](LICENSE).
