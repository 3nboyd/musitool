"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import { extractFrameFeatures } from "@/lib/audio/analysis";
import { BpmEstimator } from "@/lib/audio/bpm-estimator";
import { useStudioStore } from "@/store/useStudioStore";
import { frequencyToNoteInfo } from "@/lib/audio/note";
import { AnalysisSource, AudioFrameFeature, TunerSettings } from "@/types/studio";

interface UseAudioAnalysisOptions {
  onTheoryRequest?: (noteHistory: string[], bpm: number | null) => void;
  fileMonitorGain?: number;
  tunerSettings?: TunerSettings;
}

interface UseAudioAnalysisResult {
  source: AnalysisSource;
  isRunning: boolean;
  error: string | null;
  startMicrophone: () => Promise<void>;
  analyzeFile: (file: File) => Promise<void>;
  stop: () => void;
}

const DEFAULT_TUNER_SETTINGS: TunerSettings = {
  tolerancePreset: "standard",
  greenRangeCents: 6,
  yellowRangeCents: 14,
  temperament: "equal",
  a4Hz: 440,
};

export function useAudioAnalysis(options: UseAudioAnalysisOptions = {}): UseAudioAnalysisResult {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const monitorGainNodeRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaElementRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const bpmEstimatorRef = useRef(new BpmEstimator());
  const detectorRef = useRef(PitchDetector.forFloat32Array(2048));
  const lastTheoryRequestRef = useRef(0);
  const smoothedPitchRef = useRef<number | null>(null);
  const stableNoteRef = useRef<string | null>(null);
  const stableCentsRef = useRef<number | null>(null);
  const holdUntilRef = useRef(0);
  const candidateNoteRef = useRef<string | null>(null);
  const candidateVotesRef = useRef(0);

  const setSource = useStudioStore((state) => state.setSource);
  const setLatestFrame = useStudioStore((state) => state.setLatestFrame);
  const source = useStudioStore((state) => state.source);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      void context.resume();
    }

    if (!analyserRef.current) {
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);
    }

    return context;
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopSourceOnly = useCallback(() => {
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    monitorGainNodeRef.current?.disconnect();
    monitorGainNodeRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (mediaElementRef.current) {
      mediaElementRef.current.pause();
      mediaElementRef.current.src = "";
      mediaElementRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetTunerTracking = useCallback(() => {
    smoothedPitchRef.current = null;
    stableNoteRef.current = null;
    stableCentsRef.current = null;
    holdUntilRef.current = 0;
    candidateNoteRef.current = null;
    candidateVotesRef.current = 0;
  }, []);

  const stabilizeTuner = useCallback(
    (frame: AudioFrameFeature): AudioFrameFeature => {
      const tuning = options.tunerSettings ?? DEFAULT_TUNER_SETTINGS;
      const confidenceThreshold =
        tuning.tolerancePreset === "tight"
          ? 0.7
          : tuning.tolerancePreset === "relaxed"
            ? 0.58
            : 0.64;
      const now = frame.ts;
      const rawPitch = frame.pitchHz;

      if (rawPitch && frame.confidence >= confidenceThreshold) {
        const prev = smoothedPitchRef.current;
        const smoothing = stableNoteRef.current ? 0.78 : 0.64;
        const smoothed = prev === null ? rawPitch : prev * smoothing + rawPitch * (1 - smoothing);
        smoothedPitchRef.current = smoothed;

        const info = frequencyToNoteInfo(smoothed, {
          a4Hz: tuning.a4Hz,
          temperament: tuning.temperament,
        });
        const sameNoteFamily = stableNoteRef.current
          ? stableNoteRef.current.replace(/[0-9]/g, "") === info.note.replace(/[0-9]/g, "")
          : false;
        const closeToHeld =
          stableCentsRef.current !== null ? Math.abs(info.cents - stableCentsRef.current) <= 16 : false;

        if (!stableNoteRef.current || sameNoteFamily || closeToHeld) {
          stableNoteRef.current = info.note;
          stableCentsRef.current = info.cents;
          holdUntilRef.current = now + 260;
          candidateNoteRef.current = null;
          candidateVotesRef.current = 0;
        } else {
          if (candidateNoteRef.current === info.note) {
            candidateVotesRef.current += 1;
          } else {
            candidateNoteRef.current = info.note;
            candidateVotesRef.current = 1;
          }

          if (candidateVotesRef.current >= 3) {
            stableNoteRef.current = info.note;
            stableCentsRef.current = info.cents;
            holdUntilRef.current = now + 260;
            candidateNoteRef.current = null;
            candidateVotesRef.current = 0;
          }
        }

        return {
          ...frame,
          pitchHz: smoothedPitchRef.current,
          note: stableNoteRef.current,
          cents: stableCentsRef.current,
        };
      }

      if (stableNoteRef.current && holdUntilRef.current > now) {
        return {
          ...frame,
          pitchHz: smoothedPitchRef.current ?? frame.pitchHz,
          note: stableNoteRef.current,
          cents: stableCentsRef.current,
          confidence: Math.max(0.45, frame.confidence),
        };
      }

      if (rawPitch && frame.confidence >= 0.45) {
        const info = frequencyToNoteInfo(rawPitch, {
          a4Hz: tuning.a4Hz,
          temperament: tuning.temperament,
        });
        stableNoteRef.current = info.note;
        stableCentsRef.current = info.cents;
        holdUntilRef.current = now + 180;

        return {
          ...frame,
          note: info.note,
          cents: info.cents,
        };
      }

      stableNoteRef.current = null;
      stableCentsRef.current = null;
      candidateNoteRef.current = null;
      candidateVotesRef.current = 0;

      return {
        ...frame,
        note: null,
        cents: null,
      };
    },
    [options.tunerSettings]
  );

  const startLoop = useCallback(
    (currentSource: AnalysisSource) => {
      const context = audioContextRef.current;
      const analyser = analyserRef.current;

      if (!context || !analyser) {
        return;
      }

      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Float32Array(analyser.frequencyBinCount);

      const run = () => {
        analyser.getFloatTimeDomainData(timeData);
        analyser.getFloatFrequencyData(freqData);

        const rawFrame = extractFrameFeatures({
          timestampMs: performance.now(),
          source: currentSource,
          timeDomain: timeData,
          frequencyDomain: freqData,
          sampleRate: context.sampleRate,
          pitchDetector: detectorRef.current,
          bpmEstimator: bpmEstimatorRef.current,
        });
        const frame = stabilizeTuner(rawFrame);

        setLatestFrame(frame);

        if (options.onTheoryRequest && frame.ts - lastTheoryRequestRef.current > 220) {
          lastTheoryRequestRef.current = frame.ts;
          const noteHistory = useStudioStore.getState().noteHistory;
          options.onTheoryRequest(noteHistory, frame.bpm);
        }

        rafRef.current = requestAnimationFrame(run);
      };

      stopLoop();
      rafRef.current = requestAnimationFrame(run);
      setIsRunning(true);
    },
    [options, setLatestFrame, stabilizeTuner, stopLoop]
  );

  const connectNode = useCallback(
    (node: AudioNode, currentSource: AnalysisSource, monitorOutput: boolean) => {
      const context = ensureAudioContext();
      const analyser = analyserRef.current;

      if (!analyser) {
        throw new Error("Analyser node failed to initialize.");
      }

      bpmEstimatorRef.current.reset();
      resetTunerTracking();

      node.connect(analyser);
      monitorGainNodeRef.current?.disconnect();
      monitorGainNodeRef.current = null;

      if (monitorOutput) {
        const monitorGain = context.createGain();
        monitorGain.gain.value = clamp(options.fileMonitorGain ?? 1, 0, 1);
        node.connect(monitorGain);
        monitorGain.connect(context.destination);
        monitorGainNodeRef.current = monitorGain;
      }

      sourceNodeRef.current = node;
      setSource(currentSource);
      startLoop(currentSource);
    },
    [ensureAudioContext, options.fileMonitorGain, resetTunerTracking, setSource, startLoop]
  );

  const startMicrophone = useCallback(async () => {
    setError(null);

    try {
      stopLoop();
      stopSourceOnly();
      const context = ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;
      const sourceNode = context.createMediaStreamSource(stream);
      connectNode(sourceNode, "microphone", false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to access microphone.";
      setError(message);
      stopSourceOnly();
      setIsRunning(false);
      setSource("idle");
    }
  }, [connectNode, ensureAudioContext, setSource, stopLoop, stopSourceOnly]);

  const analyzeFile = useCallback(
    async (file: File) => {
      setError(null);

      try {
        stopLoop();
        stopSourceOnly();
        const context = ensureAudioContext();
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;

        const audioElement = new Audio(url);
        mediaElementRef.current = audioElement;

        const sourceNode = context.createMediaElementSource(audioElement);
        connectNode(sourceNode, "file", true);

        await audioElement.play();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to analyze file.";
        setError(message);
        stopSourceOnly();
        setIsRunning(false);
        setSource("idle");
      }
    },
    [connectNode, ensureAudioContext, setSource, stopLoop, stopSourceOnly]
  );

  const stop = useCallback(() => {
    stopLoop();
    stopSourceOnly();
    resetTunerTracking();
    setIsRunning(false);
    setSource("idle");
  }, [resetTunerTracking, setSource, stopLoop, stopSourceOnly]);

  useEffect(() => {
    const monitorNode = monitorGainNodeRef.current;
    const context = audioContextRef.current;
    if (!monitorNode || !context) {
      return;
    }

    const level = clamp(options.fileMonitorGain ?? 1, 0, 1);
    monitorNode.gain.setTargetAtTime(level, context.currentTime, 0.03);
  }, [options.fileMonitorGain]);

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
      source,
      isRunning,
      error,
      startMicrophone,
      analyzeFile,
      stop,
    }),
    [analyzeFile, error, isRunning, source, startMicrophone, stop]
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
