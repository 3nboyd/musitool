"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  TheoryRequestPayload,
  TheoryRequestMessage,
  TheoryResponseMessage,
  createTheoryRequestMessage,
} from "@/lib/protocol";

interface UseTheoryWorkerOptions {
  onResponse: (response: TheoryResponseMessage["payload"]) => void;
}

export function useTheoryWorker(options: UseTheoryWorkerOptions) {
  const workerRef = useRef<Worker | null>(null);
  const onResponseRef = useRef(options.onResponse);
  useEffect(() => {
    onResponseRef.current = options.onResponse;
  }, [options.onResponse]);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/theory.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<TheoryResponseMessage>) => {
      if (event.data.type !== "THEORY_RESPONSE") {
        return;
      }
      onResponseRef.current(event.data.payload);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const requestTheory = useCallback((payload: TheoryRequestPayload) => {
    const worker = workerRef.current;
    if (!worker) {
      return;
    }

    const message: TheoryRequestMessage = createTheoryRequestMessage(payload);

    worker.postMessage(message);
  }, []);

  return {
    requestTheory,
  };
}
