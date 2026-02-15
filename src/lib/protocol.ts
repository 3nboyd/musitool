import { TheoryContext, TheoryRecommendation, WorkerMessage } from "@/types/studio";

export interface TheoryRequestPayload {
  noteHistory: string[];
  bpm: number | null;
}

export interface TheoryResponsePayload {
  context: TheoryContext;
  recommendations: TheoryRecommendation[];
}

export type TheoryRequestMessage = WorkerMessage<TheoryRequestPayload> & {
  type: "THEORY_REQUEST";
};

export type TheoryResponseMessage = WorkerMessage<TheoryResponsePayload> & {
  type: "THEORY_RESPONSE";
};

export function createTheoryRequestMessage(payload: TheoryRequestPayload): TheoryRequestMessage {
  return {
    type: "THEORY_REQUEST",
    payload,
  };
}

export function createTheoryResponseMessage(payload: TheoryResponsePayload): TheoryResponseMessage {
  return {
    type: "THEORY_RESPONSE",
    payload,
  };
}
