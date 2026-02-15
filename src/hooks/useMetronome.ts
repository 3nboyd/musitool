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

    return ctx;
  }, []);

  const scheduleClick = useCallback(
    (time: number, tickIndex: number, tickIntervalSec: number) => {
      const ctx = ensureAudioContext();
      const factor = getSubdivisionFactor(metronome.subdivision);
      const beatIndex = Math.floor(tickIndex / factor) % metronome.timeSigTop;
      const isDownBeat = beatIndex === 0 && tickIndex % factor === 0;
      const accent = metronome.accents[beatIndex] ?? (isDownBeat ? 1 : 0);
      const isCountIn = countInTicksRemainingRef.current > 0;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freqBase = isCountIn ? 1500 : accent ? 1300 : 900;
      const subDivisionLift = tickIndex % factor === 0 ? 0 : -120;
      osc.frequency.value = freqBase + subDivisionLift;
      osc.type = "triangle";

      const gainValue = isCountIn ? 0.18 : accent ? 0.13 : 0.08;
      gain.gain.setValueAtTime(gainValue, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.05, tickIntervalSec * 0.6));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.06);

      setCurrentBeat(beatIndex + 1);

      if (countInTicksRemainingRef.current > 0) {
        countInTicksRemainingRef.current -= 1;
      }
    },
    [ensureAudioContext, metronome.accents, metronome.subdivision, metronome.timeSigTop]
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
    },
    [stop]
  );

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
