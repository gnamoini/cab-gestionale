/** Outbox worker drain limits — time budget primary, event cap secondary. */
export const OUTBOX_BATCH_LIMIT = 20;
export const OUTBOX_MAX_EVENTS_PER_INVOCATION = 100;
/** ponytail: Vercel serverless ceiling; upgrade path = dedicated worker with higher budget */
export const OUTBOX_PROCESSOR_TIME_BUDGET_MS = 25_000;
