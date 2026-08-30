"use client";

import { MAGAZZINO_RICAMBI_COLUMNS, MOVIMENTI_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import { fetchMovimentiListRows } from "@/lib/movimenti/movimenti-list-fetch";
import { buildStockMovementAuditPayloadWithContext } from "@/lib/magazzino/stock-audit-payload";
import { formatRicambioLogLabelFromDbRow } from "@/lib/magazzino/ricambio-log-label";
import {
  applyStockViaPipelineApi,
  shouldUseStockPipelineForMovimenti,
} from "@/lib/magazzino/movimenti-stock-pipeline";
import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditDiff, commitCriticalMutation, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow, MovimentoRicambioRow, TipoMovimentoRicambio } from "@/src/types/supabase-tables";
import { errMessageFromSupabase, serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA = "movimenti_ricambi";
const ENT_MAG = "magazzino_ricambi";

export type MovimentoCreateOptions = {
  operationId?: string | null;
  origine?: StockMovementOrigin;
  causale?: string;
  meta?: MovimentoRicambioRow["meta"];
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Segno applicazione movimento su giacenza. reverse = rollback tecnico intra-mutation (R-18). */
function stockDelta(tipo: TipoMovimentoRicambio, quantita: number, reverse: boolean): number {
  const base = tipo === "entrata" ? 1 : -1;
  const s = reverse ? -base : base;
  return s * quantita;
}

async function applyStockForMovement(
  c: Awaited<ReturnType<typeof getBrowserSupabase>>,
  mov: Pick<MovimentoRicambioRow, "ricambio_id" | "tipo" | "quantita">,
  reverse: boolean,
  audit?: { origine: StockMovementOrigin; causale: string; operationId?: string | null },
): Promise<ServiceResult<MagazzinoRicambioRow>> {
  const { data: ric, error: e1 } = await c
    .from("magazzino_ricambi")
    .select(MAGAZZINO_RICAMBI_COLUMNS)
    .eq("id", mov.ricambio_id)
    .maybeSingle();
  if (e1) return err(errMessageFromSupabase(e1, { module: "magazzino" }));
  if (!ric) return err("Ricambio non trovato");
  const before = ric as MagazzinoRicambioRow;
  const q0 = num(before.quantita);
  const dq = stockDelta(mov.tipo, num(mov.quantita), reverse);
  const q1 = q0 + dq;
  if (q1 < 0) return err("Giacenza insufficiente per il movimento richiesto");

  let updateQuery = c.from("magazzino_ricambi").update({ quantita: q1 }).eq("id", mov.ricambio_id);
  if (q1 < q0) {
    updateQuery = updateQuery.gte("quantita", q0 - q1);
  }
  const { data: after, error: e2 } = await updateQuery.select(MAGAZZINO_RICAMBI_COLUMNS).maybeSingle();
  if (e2) return err(errMessageFromSupabase(e2, { module: "magazzino" }));
  if (!after) return err("Giacenza insufficiente per il movimento richiesto");
  const updated = after as MagazzinoRicambioRow;

  const entityLabel = formatRicambioLogLabelFromDbRow(before);

  const stockPayload = audit
    ? buildStockMovementAuditPayloadWithContext(
        {
          ricambioId: mov.ricambio_id,
          quantitaBefore: q0,
          quantitaAfter: num(updated.quantita),
          origine: audit.origine,
          causale: audit.causale,
          operationId: audit.operationId,
        },
        entityLabel,
      )
    : auditDiff(before, updated);

  await writeModificaLog(c, {
    entita: ENT_MAG,
    entita_id: mov.ricambio_id,
    azione: "UPDATE",
    payload: stockPayload,
  });
  return success(updated);
}

export type MovimentiFilters = {
  ricambio_id?: string;
  lavorazione_id?: string;
  lavorazione_ids?: string[];
  mezzo_id?: string;
  tipo?: TipoMovimentoRicambio;
};

export type MovimentoInsert = Omit<MovimentoRicambioRow, "id" | "created_at">;
export type MovimentoUpdate = Partial<Pick<MovimentoRicambioRow, "tipo" | "quantita" | "lavorazione_id">>;

async function sb() {
  return getBrowserSupabase();
}

async function findByOperationId(
  c: Awaited<ReturnType<typeof getBrowserSupabase>>,
  operationId: string,
): Promise<MovimentoRicambioRow | null> {
  const { data, error } = await c
    .from("movimenti_ricambi")
    .select(MOVIMENTI_RICAMBI_COLUMNS)
    .eq("operation_id", operationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as MovimentoRicambioRow;
}

export const movimentiService = {
  async getAll(filters?: MovimentiFilters): Promise<ServiceResult<MovimentoRicambioRow[]>> {
    try {
      const c = await sb();
      return fetchMovimentiListRows(c, filters);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getById(id: string): Promise<ServiceResult<MovimentoRicambioRow>> {
    try {
      const c = await sb();
      const { data, error } = await c.from("movimenti_ricambi").select(MOVIMENTI_RICAMBI_COLUMNS).eq("id", id).maybeSingle();
      if (error) return err(errMessageFromSupabase(error, { module: "magazzino" }));
      if (!data) return err("Movimento non trovato");
      return success(data as MovimentoRicambioRow);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async create(data: MovimentoInsert, options?: MovimentoCreateOptions): Promise<ServiceResult<MovimentoRicambioRow>> {
    try {
      const c = await sb();
      const operationId = options?.operationId?.trim() || data.operation_id?.trim() || crypto.randomUUID();
      const origine = options?.origine ?? (data.meta?.origine as StockMovementOrigin | undefined) ?? "manual_adjustment";
      const causale = options?.causale ?? data.meta?.causale ?? (data.tipo === "entrata" ? "carico" : "scarico");

      if (operationId) {
        const existing = await findByOperationId(c, operationId);
        if (existing) return success(existing);
      }

      if (shouldUseStockPipelineForMovimenti()) {
        const piped = await applyStockViaPipelineApi(c, data, {
          operationId,
          origine,
          causale,
        });
        if (!piped.success || !piped.data) return err(piped.error ?? "Aggiornamento stock non riuscito");
        return success(piped.data.movimento);
      }

      return await commitCriticalMutation(c, async () => {
        const stock = await applyStockForMovement(c, data, false, {
          origine,
          causale,
          operationId,
        });
        if (!stock.success || !stock.data) return err(stock.error ?? "Aggiornamento giacenza fallito");
        const quantitaAfter = num(stock.data.quantita);
        const quantitaBefore = quantitaAfter - stockDelta(data.tipo, num(data.quantita), false);

        const insertPayload: MovimentoInsert = {
          ...data,
          operation_id: operationId,
          meta: {
            ...(data.meta ?? {}),
            ...(options?.meta ?? {}),
            origine,
            causale,
          },
        };

        const { data: row, error } = await c.from("movimenti_ricambi").insert(insertPayload).select(MOVIMENTI_RICAMBI_COLUMNS).single();
        if (error) {
          await applyStockForMovement(c, data, true);
          if (operationId) {
            const raced = await findByOperationId(c, operationId);
            if (raced) return success(raced);
          }
          return err(errMessageFromSupabase(error, { module: "magazzino" }));
        }
        const r = row as MovimentoRicambioRow;
        const entityLabel = formatRicambioLogLabelFromDbRow(stock.data);
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: r.id,
          azione: "CREATE",
          payload: buildStockMovementAuditPayloadWithContext(
            {
              ricambioId: r.ricambio_id,
              quantitaBefore,
              quantitaAfter,
              origine,
              causale,
              movimentoId: r.id,
              operationId,
            },
            entityLabel,
          ),
        });
        return success(r);
      });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** R-18: storno operativo — nuovo movimento inverso, nessun DELETE. */
  async storno(id: string, options?: { operationId?: string; causale?: string }): Promise<ServiceResult<MovimentoRicambioRow>> {
    const got = await this.getById(id);
    if (!got.success || !got.data) return err(got.error ?? "Movimento non trovato");
    const original = got.data;
    const inverse: TipoMovimentoRicambio = original.tipo === "entrata" ? "uscita" : "entrata";
    return this.create(
      {
        ricambio_id: original.ricambio_id,
        lavorazione_id: original.lavorazione_id,
        tipo: inverse,
        quantita: original.quantita,
        conta_statistiche: original.conta_statistiche,
        meta: { storno_di: original.id, causale: options?.causale ?? "storno_operativo", origine: "storno" },
      },
      {
        operationId: options?.operationId,
        origine: "storno",
        causale: options?.causale ?? "storno_operativo",
      },
    );
  },

  async update(id: string, data: MovimentoUpdate): Promise<ServiceResult<MovimentoRicambioRow>> {
    if (data.tipo != null || data.quantita != null) {
      return err("Modifica movimento contabilizzato non consentita. Usa storno.");
    }
    try {
      const c = await sb();
      const { data: oldRow, error: e0 } = await c.from("movimenti_ricambi").select(MOVIMENTI_RICAMBI_COLUMNS).eq("id", id).maybeSingle();
      if (e0) return err(errMessageFromSupabase(e0, { module: "magazzino" }));
      if (!oldRow) return err("Movimento non trovato");
      const old = oldRow as MovimentoRicambioRow;

      return await commitCriticalMutation(c, async () => {
        const { data: row, error } = await c.from("movimenti_ricambi").update(data).eq("id", id).select(MOVIMENTI_RICAMBI_COLUMNS).single();
        if (error) return err(errMessageFromSupabase(error, { module: "magazzino" }));
        const r = row as MovimentoRicambioRow;
        await writeModificaLog(c, {
          entita: ENTITA,
          entita_id: id,
          azione: "UPDATE",
          payload: auditDiff(old, r),
        });
        return success(r);
      });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** @deprecated R-18: solo rollback tecnico — non esporre in UI. */
  async remove(): Promise<ServiceResult<null>> {
    return err("Eliminazione movimento non consentita. Usa storno.");
  },
};
