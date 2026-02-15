"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applySwing, getSubdivisionFactor, tapTempoFromTimestamps } from "@/lib/metronome/math";
import { useStudioStore } from "@/store/useStudioStore";

interface UseMetronomeResult {
  isRunning: boolean;
  currentBeat: number;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  tapTempo: () => void;
}

export function useMetronome(): UseMetronomeResult {
  const metronome = useStudioStore((state) => state.metronome);
  const isRunning = useStudioStore((state) => state.metronomeRunning);
  const setMetronomeRunning = useStudioStore((state) => state.setMetronomeRunning);
  const updateMetronome = useStudioStore((state) => state.updateMetronome);

  const [currentBeat, setCurrentBeat] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const nextTickTimeRef = useRef(0);
  const currentTickRef = useRef(0);
  const tapBufferRef = useRef<number[]>([]);
  const countInTicksRemainingRef = useRef(0);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    if (!masterGainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = metronome.volume;
      gain.connect(ctx.destination);
      masterGainRef.current = gain;
    }

    return ctx;
  }, [metronome.volume]);

  const scheduleClick = useCallback(
    (time: number, tickIndex: number, tickIntervalSec: number) => {
      const ctx = ensureAudioContext();
      const factor = getSubdivisionFactor(metronome.subdivision);
      const beatIndex = Math.floor(tickIndex / factor) % metronome.timeSigTop;
      const isDownBeat = beatIndex === 0 && tickIndex % factor === 0;
      const accent = metronome.accents[beatIndex] ?? (isDownBeat ? 1 : 0);
      const isCountIn = countInTicksRemainingRef.current > 0;
      const isSubdivisionTick = tickIndex % factor !== 0;
      const profile = getSoundProfile(metronome.sound, {
        accent,
        isCountIn,
        isSubdivisionTick,
      });

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = profile.type;
      osc.frequency.setValueAtTime(profile.frequency, time);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(80, profile.frequency * profile.sweepRatio),
        time + profile.duration
      );

      gain.gain.setValueAtTime(profile.gain, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(profile.duration, tickIntervalSec * 0.8));

      osc.connect(gain);
      gain.connect(masterGainRef.current ?? ctx.destination);

      osc.start(time);
      osc.stop(time + profile.duration + 0.01);

      setCurrentBeat(beatIndex + 1);

      if (countInTicksRemainingRef.current > 0) {
        countInTicksRemainingRef.current -= 1;
      }
    },
    [ensureAudioContext, metronome.accents, metronome.sound, metronome.subdivision, metronome.timeSigTop]
  );

  const scheduler = useCallback(() => {
    const ctx = ensureAudioContext();
    const lookAheadSec = 0.12;
    const factor = getSubdivisionFactor(metronome.subdivision);
    const baseIntervalSec = (60 / metronome.bpm) / factor;

    while (nextTickTimeRef.current < ctx.currentTime + lookAheadSec) {
      const tickIndex = currentTickRef.current;
      scheduleClick(nextTickTimeRef.current, tickIndex, baseIntervalSec);

      const intervalWithSwing =
        factor >= 2
          ? applySwing(baseIntervalSec * 1000, tickIndex, metronome.swing) / 1000
          : baseIntervalSec;

      nextTickTimeRef.current += intervalWithSwing;
      currentTickRef.current += 1;
    }
  }, [ensureAudioContext, metronome.bpm, metronome.subdivision, metronome.swing, scheduleClick]);

  const clearScheduler = useCallback(() => {
    if (schedulerTimerRef.current !== null) {
      window.clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearScheduler();
    setMetronomeRunning(false);
    currentTickRef.current = 0;
    countInTicksRemainingRef.current = 0;
  }, [clearScheduler, setMetronomeRunning]);

  const start = useCallback(() => {
    const ctx = ensureAudioContext();

    clearScheduler();
    setMetronomeRunning(true);
    currentTickRef.current = 0;
    const factor = getSubdivisionFactor(metronome.subdivision);
    countInTicksRemainingRef.current = metronome.countInBars * metronome.timeSigTop * factor;
    nextTickTimeRef.current = ctx.currentTime + 0.05;

    scheduler();
    schedulerTimerRef.current = window.setInterval(scheduler, 25);
  }, [clearScheduler, ensureAudioContext, metronome.countInBars, metronome.subdivision, metronome.timeSigTop, scheduler, setMetronomeRunning]);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
      return;
    }

    start();
  }, [isRunning, start, stop]);

  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapBufferRef.current = [...tapBufferRef.current, now].slice(-6);
    const bpm = tapTempoFromTimestamps(tapBufferRef.current);
    if (bpm) {
      updateMetronome({ bpm });
    }
  }, [updateMetronome]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    start();

    return () => {
      clearScheduler();
    };
  }, [clearScheduler, isRunning, metronome, start]);

  useEffect(
    () => () => {
      stop();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      masterGainRef.current = null;
    },
    [stop]
  );

  useEffect(() => {
    const ctx = audioContextRef.current;
    const gain = masterGainRef.current;
    if (!ctx || !gain) {
      return;
    }

    gain.gain.setTargetAtTime(Math.max(0, Math.min(1, metronome.volume)), ctx.currentTime, 0.02);
  }, [metronome.volume]);

  return useMemo(
    () => ({
      isRunning,
      currentBeat,
      start,
      stop,
      toggle,
      tapTempo,
    }),
    [currentBeat, isRunning, start, stop, tapTempo, toggle]
  );
}

function getSoundProfile(
  sound: "click" | "woodblock" | "digital" | "shaker",
  input: { accent: number; isCountIn: boolean; isSubdivisionTick: boolean }
): {
  type: OscillatorType;
  frequency: number;
  gain: number;
  duration: number;
  sweepRatio: number;
} {
  const emphasized = input.isCountIn || input.accent === 1;
  const subdivisionPenalty = input.isSubdivisionTick ? 0.86 : 1;

  if (sound === "woodblock") {
    return {
      type: "square",
      frequency: emphasized ? 980 : 720,
      gain: (emphasized ? 0.16 : 0.11) * subdivisionPenalty,
      duration: emphasized ? 0.06 : 0.045,
      sweepRatio: 0.78,
    };
  }

  if (sound === "digital") {
    return {
      type: "sine",
      frequency: emphasized ? 1520 : 1110,
      gain: (emphasized ? 0.15 : 0.09) * subdivisionPenalty,
      duration: emphasized ? 0.045 : 0.035,
      sweepRatio: 0.9,
    };
  }

  if (sound === "shaker") {
    return {
      type: "sawtooth",
      frequency: emphasized ? 1680 : 1320,
      gain: (emphasized ? 0.11 : 0.075) * subdivisionPenalty,
      duration: emphasized ? 0.035 : 0.025,
      sweepRatio: 0.72,
    };
  }

  return {
    type: "triangle",
    frequency: emphasized ? 1320 : 940,
    gain: (emphasized ? 0.16 : 0.105) * subdivisionPenalty,
    duration: emphasized ? 0.055 : 0.04,
    sweepRatio: 0.82,
  };
}
