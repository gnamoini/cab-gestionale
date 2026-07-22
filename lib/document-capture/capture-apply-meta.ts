import type { InterventoWriteContext } from "@/lib/domain/intervento-context/intervento-write-context";

export type CaptureApplyMeta = {
  priorita?: unknown;
  statoId?: string;
  writeContext?: InterventoWriteContext;
};
