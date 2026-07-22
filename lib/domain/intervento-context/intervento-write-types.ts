import type { MezzoGestito } from "@/lib/mezzi/types";
import type { UpsertMezzoFromSchedaResult } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { LavorazioneListRow, LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import type { PersistSchedeResult } from "@/lib/schede/schede-sync-adapter";

export type InterventoWriteMode = "create" | "edit";

export type InterventoWriteStage =
  | "resolve"
  | "prepare-mezzo"
  | "prepare-lavorazione"
  | "persist-scheda"
  | "finalize";

import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import type { InterventoWriteContext } from "@/lib/domain/intervento-context/intervento-write-context";

export type InterventoWriteCreateMeta = {
  statoId: StatoLavorazione;
  priorita: PrioritaLavorazione;
  mezzoIdHint?: string | null;
  /** @deprecated preferire writeContext.mezzoUpdatePlan */
  mezzoUpdatePlan?: MezzoUpdateFromSchedaPlan;
  writeContext?: InterventoWriteContext;
  dataIngressoIso: string;
  note: string | null;
  createdBy: string;
};

export type InterventoWriteEditMeta = {
  row: LavorazioneListRow;
  /** @deprecated preferire writeContext.mezzoUpdatePlan */
  mezzoUpdatePlan?: MezzoUpdateFromSchedaPlan;
  writeContext?: InterventoWriteContext;
};

export type InterventoWritePlan = {
  mode: InterventoWriteMode;
  idempotencyKey: string;
  fields: SchedaIngressoFields;
  lavorazioneId?: string | null;
  mezziCatalog: readonly MezzoGestito[];
  meta: InterventoWriteCreateMeta | InterventoWriteEditMeta;
};

export type InterventoWriteDeps = {
  upsertMezzo: (input: {
    fields: SchedaIngressoFields;
    preferredMezzoId?: string | null;
    updatePlan?: MezzoUpdateFromSchedaPlan;
    lavorazioneId?: string | null;
    writeContext?: import("@/lib/domain/intervento-context/intervento-write-context").InterventoWriteContext;
  }) => Promise<UpsertMezzoFromSchedaResult>;
  createLavorazione?: (input: {
    mezzo_id: string | null;
    stato: StatoLavorazione;
    priorita: PrioritaLavorazione;
    data_ingresso: string;
    note: string | null;
    created_by: string;
    target_type: import("@/src/types/supabase-tables").InterventoTargetType;
    attrezzatura_id: string | null;
  }) => Promise<LavorazioneRow>;
  updateLavorazione?: (id: string, patch: LavorazioneUpdate) => Promise<void>;
  persistScheda?: (input: {
    lavorazioneId: string;
    fields: SchedaIngressoFields;
    createdBy: string;
  }) => Promise<PersistSchedeResult>;
};

export type InterventoWriteResult =
  | { ok: true; lavorazioneId: string; mezzoId: string }
  | {
      ok: false;
      stage: InterventoWriteStage;
      error: string;
      lavorazioneId?: string;
    };
