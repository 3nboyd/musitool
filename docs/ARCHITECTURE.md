# Architecture

ImproviBuddy is a Next.js application whose interactive studio runs primarily in the browser.

## Runtime overview

`src/app/page.tsx` renders the studio shell. Client-side panels read and update the Zustand store, while hooks connect browser audio and MIDI APIs to analysis utilities and visual components.

```text
Microphone / audio file / MIDI
              |
              v
     Browser integration hooks
              |
              v
 Analysis and timing libraries <-> Theory worker
              |
              v
         Zustand store
          /         \
         v           v
 Studio panels   IndexedDB persistence
```

## Main layers

- `src/components/studio` contains the application shell, controls, meters, visualizations, form sheet, and theory panels.
- `src/hooks` owns Web Audio, Web MIDI, metronome, and worker lifecycles.
- `src/lib/audio` contains reusable pitch, note, waveform, spectrum, and BPM logic.
- `src/lib/theory` handles defaults, recommendations, form compression, and chart export.
- `src/lib/midi` contains quantization and MIDI helpers.
- `src/lib/storage` persists sessions through Dexie and IndexedDB.
- `src/store` owns the shared runtime session state.
- `src/workers` performs theory work away from the interface thread.

## Data ownership

The browser is the system of record. Session records are stored in IndexedDB, and imported audio is analyzed locally. There is no application API, cloud database, authentication service, or analytics endpoint.

## Testing strategy

Core music and persistence behavior is covered with Vitest. IndexedDB tests use `fake-indexeddb`, and interface tests use Testing Library with jsdom. The production build provides an additional server/client boundary and type check.
