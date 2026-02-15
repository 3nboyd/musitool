/// <reference lib="webworker" />

import { buildTheoryContext, getTheoryRecommendations } from "@/lib/theory/recommendations";
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

  const { noteHistory, bpm } = message.payload;
  const context = buildTheoryContext(noteHistory, bpm);
  const recommendations = getTheoryRecommendations(context, noteHistory);

  const response: TheoryResponseMessage = createTheoryResponseMessage({
    context,
    recommendations,
  });

  self.postMessage(response);
};

export {};
