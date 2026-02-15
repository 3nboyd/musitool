"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import { extractFrameFeatures } from "@/lib/audio/analysis";
import { BpmEstimator } from "@/lib/audio/bpm-estimator";
import { useStudioStore } from "@/store/useStudioStore";
import { AnalysisSource } from "@/types/studio";

interface UseAudioAnalysisOptions {
  onTheoryRequest?: (noteHistory: string[], bpm: number | null) => void;
}

interface UseAudioAnalysisResult {
  source: AnalysisSource;
  isRunning: boolean;
  error: string | null;
  startMicrophone: () => Promise<void>;
  analyzeFile: (file: File) => Promise<void>;
  stop: () => void;
}

export function useAudioAnalysis(options: UseAudioAnalysisOptions = {}): UseAudioAnalysisResult {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaElementRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const bpmEstimatorRef = useRef(new BpmEstimator());
  const detectorRef = useRef(PitchDetector.forFloat32Array(2048));
  const lastTheoryRequestRef = useRef(0);

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

        const frame = extractFrameFeatures({
          timestampMs: performance.now(),
          source: currentSource,
          timeDomain: timeData,
          frequencyDomain: freqData,
          sampleRate: context.sampleRate,
          pitchDetector: detectorRef.current,
          bpmEstimator: bpmEstimatorRef.current,
        });

        setLatestFrame(frame);

        if (options.onTheoryRequest && frame.ts - lastTheoryRequestRef.current > 130) {
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
    [options, setLatestFrame, stopLoop]
  );

  const connectNode = useCallback(
    (node: AudioNode, currentSource: AnalysisSource, monitorOutput: boolean) => {
      const context = ensureAudioContext();
      const analyser = analyserRef.current;

      if (!analyser) {
        throw new Error("Analyser node failed to initialize.");
      }

      bpmEstimatorRef.current.reset();

      node.connect(analyser);
      try {
        analyser.disconnect();
      } catch {
        // no-op: analyser may have no output connections
      }
      if (monitorOutput) {
        try {
          analyser.connect(context.destination);
        } catch {
          // no-op: destination may already be connected
        }
      } else {
        try {
          analyser.disconnect(context.destination);
        } catch {
          // no-op: destination may not be connected yet
        }
      }

      sourceNodeRef.current = node;
      setSource(currentSource);
      startLoop(currentSource);
    },
    [ensureAudioContext, setSource, startLoop]
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
    setIsRunning(false);
    setSource("idle");
  }, [setSource, stopLoop, stopSourceOnly]);

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
