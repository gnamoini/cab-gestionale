/**
 * @advisory v6.2 — build-time debug observation emitter (in-memory, env-gated).
 */
export type DebugObservationEvent = {
  module: string;
  event: string;
  hint: string;
  at?: string;
};

const MAX_EVENTS = 50;
const buffer: DebugObservationEvent[] = [];

function isObservationEnabled(): boolean {
  return typeof process !== "undefined" && process.env.SELECTOR_DEBUG_OBSERVATION === "true";
}

export const debugObservation = {
  emit(event: DebugObservationEvent): void {
    if (!isObservationEnabled()) return;
    buffer.push({
      ...event,
      at: event.at ?? new Date().toISOString(),
    });
    while (buffer.length > MAX_EVENTS) {
      buffer.shift();
    }
  },

  list(): readonly DebugObservationEvent[] {
    return [...buffer];
  },

  clear(): void {
    buffer.length = 0;
  },
};

export function __resetDebugObservationForTests(): void {
  buffer.length = 0;
}
