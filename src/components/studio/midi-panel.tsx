import { Panel } from "@/components/ui/panel";
import { noteNumberToName } from "@/lib/audio/note";
import { MidiDeviceInfo, MidiEvent, RecordedMidiEvent, Subdivision } from "@/types/studio";

interface MidiPanelProps {
  supported: boolean;
  connected: boolean;
  connecting: boolean;
  devices: MidiDeviceInfo[];
  events: MidiEvent[];
  recording: boolean;
  recordedEvents: RecordedMidiEvent[];
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleRecording: () => void;
  onReplay: () => void;
  onClearRecorded: () => void;
  onQuantize: (subdivision: Subdivision) => void;
}

const QUANTIZE_CHOICES: Subdivision[] = ["quarter", "eighth", "triplet", "sixteenth"];

export function MidiPanel({
  supported,
  connected,
  connecting,
  devices,
  events,
  recording,
  recordedEvents,
  onConnect,
  onDisconnect,
  onToggleRecording,
  onReplay,
  onClearRecorded,
  onQuantize,
}: MidiPanelProps) {
  return (
    <Panel title="MIDI Studio" subtitle="Device monitoring, synth playback, phrase recording">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={connected ? onDisconnect : onConnect}
          disabled={!supported || connecting}
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {supported ? (connected ? "Disconnect MIDI" : connecting ? "Connecting..." : "Connect MIDI") : "MIDI Unsupported"}
        </button>
        <button
          type="button"
          onClick={onToggleRecording}
          disabled={!connected}
          className={`rounded-md border px-4 py-2 text-sm font-semibold ${
            recording
              ? "border-red-400 bg-red-500/20 text-red-200"
              : "border-slate-700 bg-slate-900 text-slate-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {recording ? "Stop Recording" : "Record Phrase"}
        </button>
        <button
          type="button"
          onClick={onReplay}
          disabled={recordedEvents.length === 0}
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Replay
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Devices</p>
          {devices.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No active MIDI inputs.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {devices.map((device) => (
                <li key={device.id} className="rounded border border-slate-800 bg-slate-900 px-2 py-1">
                  {device.name} ({device.manufacturer})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Live Event Stream</p>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No incoming events yet.</p>
          ) : (
            <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-slate-300">
              {events.slice(0, 20).map((event) => (
                <li key={`${event.ts}-${event.note}-${event.type}`} className="rounded border border-slate-800 px-2 py-1">
                  {event.type.toUpperCase()} {noteNumberToName(event.note)} vel:{event.velocity} ch:{event.channel + 1}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-500">Recorded Phrase ({recordedEvents.length} events)</p>
          <button
            type="button"
            onClick={onClearRecorded}
            disabled={recordedEvents.length === 0}
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {QUANTIZE_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onQuantize(choice)}
              disabled={recordedEvents.length === 0}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Quantize {choice}
            </button>
          ))}
        </div>

        {recordedEvents.length > 0 ? (
          <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-slate-300">
            {recordedEvents.slice(0, 24).map((event, index) => (
              <li key={`${event.ts}-${index}`} className="rounded border border-slate-800 px-2 py-1">
                {event.offsetMs.toString().padStart(4, "0")}ms · {event.type.toUpperCase()} {noteNumberToName(event.note)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}
