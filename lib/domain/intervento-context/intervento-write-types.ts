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

export type InterventoWriteCreateMeta = {
  statoId: StatoLavorazione;
  priorita: PrioritaLavorazione;
  mezzoIdHint?: string | null;
  dataIngressoIso: string;
  note: string | null;
  createdBy: string;
};

export type InterventoWriteEditMeta = {
  row: LavorazioneListRow;
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
