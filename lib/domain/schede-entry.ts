"use client";

import { schedeService } from "@/src/services/schede.service";

/** Schede writes are covered by intervento-entry upstream; reads passthrough. */
export const schedeEntry = schedeService;

export type { SchedaFilters, SchedaInsert, SchedaUpdate } from "@/src/services/schede.service";
export { SCHEDA_CONCURRENCY_CONFLICT } from "@/src/services/schede.service";
