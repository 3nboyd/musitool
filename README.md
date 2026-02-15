# MusiTool - Music Analysis Studio

MusiTool is a web-based music engineering workspace for fast production analysis and theory exploration.

## Features in this release

- Live audio analysis (microphone or uploaded file)
- Oscilloscope and spectral monitor (canvas, low-latency)
- Pitch, note, confidence, tuner cents, and BPM estimate
- Theory assistant with key/scale/chord hypothesis and ranked recommendations
- Circle-of-fifths quick reference
- Advanced metronome (subdivisions, swing, accents, tap tempo, count-in)
- Basic MIDI workflow (device input, live event stream, built-in synth playback)
- MIDI phrase recording, replay, and quantization
- Local session persistence with IndexedDB (save/load/delete)
- Session JSON export/import

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Zustand (state)
- Dexie (IndexedDB)
- pitchy + Meyda (audio analysis)
- tonal (music theory)
- Web MIDI API + Web Audio API
- Vitest + Testing Library

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test and quality commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel.
3. Use default Next.js settings.
4. Deploy.

No backend/database service is required for this release.

## Browser support

Desktop-first:

- Chrome (recommended)
- Edge
- Firefox
- Safari

MIDI availability depends on browser support for Web MIDI API.

## Project structure

- `src/components/studio` UI panels and app shell
- `src/hooks` runtime hooks (audio, metronome, MIDI, theory worker)
- `src/lib` core engines and helpers
- `src/lib/storage` IndexedDB persistence
- `src/store` Zustand store
- `src/workers` worker protocol implementation

## Current limitations (planned next)

- No cloud sync/auth
- No collaboration links
- No SoundFont import pipeline yet
- No DAW export pack beyond JSON session export
