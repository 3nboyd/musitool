/// <reference lib="webworker" />

import { analyzeTheoryState } from "@/lib/theory/recommendations";
import {
  TheoryRequestMessage,
  TheoryResponseMessage,
  createTheoryResponseMessage,
} from "@/lib/protocol";

self.onmessage = (event: MessageEvent<TheoryRequestMessage>) => {
  const message = event.data;

  if (message.type !== "THEORY_REQUEST") {
    return;
  }

  const { noteHistory, bpm, previousContext, previousMemory, nowMs } = message.payload;
  const { context, recommendations, memory } = analyzeTheoryState({
    noteHistory,
    bpm,
    previousContext,
    previousMemory,
    nowMs,
  });

  const response: TheoryResponseMessage = createTheoryResponseMessage({
    context,
    recommendations,
    memory,
  });

  self.postMessage(response);
};

export {};
