"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { midiToFrequency, noteNumberToName, velocityToGain } from "@/lib/audio/note";
import { useStudioStore } from "@/store/useStudioStore";
import { MidiDeviceInfo, MidiEvent } from "@/types/studio";

interface UseMidiResult {
  supported: boolean;
  connected: boolean;
  connecting: boolean;
  devices: MidiDeviceInfo[];
  connect: () => Promise<void>;
  disconnect: () => void;
  replayRecorded: () => void;
}

interface ActiveVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;

export function useMidi(): UseMidiResult {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeVoicesRef = useRef<Map<string, ActiveVoice>>(new Map());

  const setSource = useStudioStore((state) => state.setSource);
  const appendNote = useStudioStore((state) => state.appendNote);
  const setMidiSupported = useStudioStore((state) => state.setMidiSupported);
  const setMidiDevices = useStudioStore((state) => state.setMidiDevices);
  const addMidiEvent = useStudioStore((state) => state.addMidiEvent);
  const recordMidiEvent = useStudioStore((state) => state.recordMidiEvent);
  const recordedEvents = useStudioStore((state) => state.recordedEvents);

  const devices = useStudioStore((state) => state.midiDevices);
  const supported = useStudioStore((state) => state.midiSupported);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const releaseVoice = useCallback((voiceKey: string) => {
    const voice = activeVoicesRef.current.get(voiceKey);
    if (!voice) {
      return;
    }

    const now = voice.gain.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    voice.oscillator.stop(now + 0.1);
    activeVoicesRef.current.delete(voiceKey);
  }, []);

  const triggerVoice = useCallback(
    (note: number, velocity: number, channel: number) => {
      const ctx = ensureAudioContext();
      const key = `${channel}-${note}`;

      releaseVoice(key);

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sawtooth";
      oscillator.frequency.value = midiToFrequency(note);

      const baseGain = velocityToGain(velocity) * 0.12;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(baseGain, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(baseGain * 0.8, now + 0.08);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);

      activeVoicesRef.current.set(key, { oscillator, gain });
    },
    [ensureAudioContext, releaseVoice]
  );

  const toEvent = useCallback((event: MIDIMessageEvent): MidiEvent | null => {
    const data = event.data;
    if (!data || data.length < 3) {
      return null;
    }

    const status = data[0];
    const command = status & 0xf0;
    const channel = status & 0x0f;
    const note = data[1];
    const velocity = data[2];

    if (command !== NOTE_ON && command !== NOTE_OFF) {
      return null;
    }

    const type = command === NOTE_ON && velocity > 0 ? "noteon" : "noteoff";

    const target = event.currentTarget as MIDIInput | null;

    return {
      ts: performance.now(),
      deviceId: target?.id ?? "unknown",
      note,
      velocity,
      channel,
      type,
    };
  }, []);

  const onMidiMessage = useCallback(
    (event: MIDIMessageEvent) => {
      const midiEvent = toEvent(event);
      if (!midiEvent) {
        return;
      }

      addMidiEvent(midiEvent);
      recordMidiEvent(midiEvent);
      setSource("midi");

      if (midiEvent.type === "noteon") {
        appendNote(noteNumberToName(midiEvent.note));
        triggerVoice(midiEvent.note, midiEvent.velocity, midiEvent.channel);
      } else {
        releaseVoice(`${midiEvent.channel}-${midiEvent.note}`);
      }
    },
    [addMidiEvent, appendNote, recordMidiEvent, releaseVoice, setSource, toEvent, triggerVoice]
  );

  const refreshDevices = useCallback(() => {
    const midi = midiAccessRef.current;
    if (!midi) {
      setMidiDevices([]);
      return;
    }

    const nextDevices: MidiDeviceInfo[] = [];
    midi.inputs.forEach((input) => {
      nextDevices.push({
        id: input.id,
        name: input.name ?? "Unknown Input",
        manufacturer: input.manufacturer ?? "Unknown",
        state: input.state,
      });
    });

    setMidiDevices(nextDevices);
  }, [setMidiDevices]);

  const connect = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
      setMidiSupported(false);
      return;
    }

    setConnecting(true);

    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;
      setMidiSupported(true);

      access.inputs.forEach((input) => {
        input.onmidimessage = onMidiMessage;
      });

      access.onstatechange = () => {
        refreshDevices();
        access.inputs.forEach((input) => {
          input.onmidimessage = onMidiMessage;
        });
      };

      refreshDevices();
      setConnected(true);
    } catch {
      setMidiSupported(false);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [onMidiMessage, refreshDevices, setMidiSupported]);

  const disconnect = useCallback(() => {
    const access = midiAccessRef.current;
    if (access) {
      access.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      access.onstatechange = null;
    }

    midiAccessRef.current = null;
    setMidiDevices([]);
    setConnected(false);
  }, [setMidiDevices]);

  const replayRecorded = useCallback(() => {
    if (recordedEvents.length === 0) {
      return;
    }

    const sequence = [...recordedEvents].sort((a, b) => a.offsetMs - b.offsetMs);

    sequence.forEach((event) => {
      window.setTimeout(() => {
        if (event.type === "noteon") {
          triggerVoice(event.note, event.velocity, event.channel);
        } else {
          releaseVoice(`${event.channel}-${event.note}`);
        }
      }, event.offsetMs);
    });
  }, [recordedEvents, releaseVoice, triggerVoice]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    setMidiSupported(Boolean(navigator.requestMIDIAccess));
  }, [setMidiSupported]);

  useEffect(
    () => () => {
      disconnect();
      activeVoicesRef.current.forEach((_, key) => {
        releaseVoice(key);
      });

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    },
    [disconnect, releaseVoice]
  );

  return useMemo(
    () => ({
      supported,
      connected,
      connecting,
      devices,
      connect,
      disconnect,
      replayRecorded,
    }),
    [connect, connected, connecting, devices, disconnect, replayRecorded, supported]
  );
}
