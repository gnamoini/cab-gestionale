"use client";

import { isInterventoWriteRpcEnabled } from "@/lib/domain/intervento-context/intervento-write-flags";
import type { CreateInterventoTransactionResult } from "@/lib/domain/intervento-context/write-contract";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";

export type CreateInterventoAtomicPayload = {
  idempotencyKey: string;
  fields: SchedaIngressoFields;
  meta: {
    statoId: StatoLavorazione;
    priorita: PrioritaLavorazione;
    mezzoIdHint?: string | null;
    dataIngressoIso: string;
    note: string | null;
    createdBy: string;
  };
  existingLavorazioneId?: string | null;
};

type CreateInterventoAtomicRpcRow = {
  lavorazione_id?: string | null;
  mezzo_id?: string | null;
};

/**
 * RPC `create_intervento_atomic` — opzionale (flag NEXT_PUBLIC_INTERVENTO_WRITE_RPC).
 * Idempotency envelope: ledger v2 in `createInterventoTransaction` / saga via `executeInterventoWrite`.
 */
export const interventoWriteService = {
  async createInterventoAtomic(
    payload: CreateInterventoAtomicPayload,
  ): Promise<ServiceResult<CreateInterventoTransactionResult>> {
    if (!isInterventoWriteRpcEnabled()) {
      return err("RPC intervento non abilitato (NEXT_PUBLIC_INTERVENTO_WRITE_RPC).");
    }

    try {
      const { data, error } = await getBrowserSupabase().rpc("create_intervento_atomic", {
        p_idempotency_key: payload.idempotencyKey,
        p_fields: payload.fields,
        p_meta: payload.meta,
        p_existing_lavorazione_id: payload.existingLavorazioneId ?? null,
      });

      if (error) {
        return err(error.message || "RPC create_intervento_atomic fallita.");
      }

      const row = (data ?? null) as CreateInterventoAtomicRpcRow | null;
      const lavorazioneId = row?.lavorazione_id?.trim() ?? "";
      if (!lavorazioneId) {
        return err("RPC create_intervento_atomic: risposta incompleta.");
      }

      return success({
        ok: true,
        lavorazioneId,
        mezzoId: row?.mezzo_id?.trim() ?? payload.meta.mezzoIdHint?.trim() ?? "",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Errore RPC create_intervento_atomic.";
      return err(message);
    }
  },
};
