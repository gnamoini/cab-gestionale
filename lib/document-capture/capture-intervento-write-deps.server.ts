import "server-only";

import { buildServerAttrezzaturaResolveDeps } from "@/lib/domain/mezzo-attrezzatura/build-server-attrezzatura-resolve-deps";
import { buildServerMezzoResolveDeps } from "@/lib/domain/mezzo/build-server-mezzo-resolve-deps";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import {
  logMezzoResolutionEvent,
  resolutionEventFromResult,
} from "@/lib/domain/mezzo/log-mezzo-resolution-event.server";
import { applyAssociationChangeDb } from "@/lib/domain/mezzo/apply-association-change";
import { recordMezzoAnagraficaHistoryServer } from "@/lib/domain/mezzo/record-mezzo-anagrafica-history.server";
import { mezzoUpdateTouchesAssociationFields } from "@/lib/domain/mezzo/mezzo-association";
import { resolveMezzoUpdatePlanFromContext } from "@/lib/domain/intervento-context/intervento-write-context";
import {
  LAVORAZIONI_COLUMNS,
  MEZZI_COLUMNS,
  SCHEDA_LAVORAZIONE_COLUMNS,
} from "@/lib/db/table-select-columns";
import { fetchMezziGestitiListRows } from "@/lib/mezzi/mezzi-list-fetch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { MezzoSchedaValidationError, upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import {
  bundleToSchedaPayloads,
  schedaInsertFromBundlePart,
  schedaUpdateFromContenuto,
} from "@/lib/schede/schede-db-mapper";
import { normalizeSchedaTipoDb } from "@/lib/schede/scheda-tipo-db-mapper";
import type { PersistSchedeResult } from "@/lib/schede/schede-sync-adapter";
import { buildCaptureSchedeBundle, inferCaptureSchedaTipo, type CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { CaptureApprovedCreates } from "@/lib/document-capture/capture-approved-creates";
import { fetchMagazzinoListAuthorizedServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import { mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { InterventoWriteDeps } from "@/lib/domain/intervento-context/intervento-write-types";
import { pickLavorazioneCreatePayload } from "@/lib/validation/services/lavorazioni-payload";
import { sanitizeMezzoWritePayload } from "@/lib/validation/services/mezzi-payload";
import { auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import type { MezzoUpdate } from "@/src/services/mezzi.service";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export async function fetchCaptureMagazzinoCatalog(): Promise<RicambioMagazzino[]> {
  const res = await fetchMagazzinoListAuthorizedServer(undefined, "list");
  if (!res.success || !res.data) return [];
  return mapMagazzinoRowsToUI(res.data, "Sistema");
}

export async function fetchCaptureMezziCatalog(): Promise<MezzoGestito[]> {
  const sb = await createSupabaseServerUserClient();
  const res = await fetchMezziGestitiListRows(sb);
  if (!res.success || !res.data) {
    throw new Error(res.error ?? "Catalogo mezzi non disponibile");
  }
  return res.data;
}

async function persistCaptureBundleServer(
  bundle: LavorazioneSchedeBundle,
  autoreId: string,
): Promise<PersistSchedeResult> {
  const sb = await createSupabaseServerUserClient();
  const { data: rows, error: readError } = await sb
    .from("scheda_lavorazione")
    .select(SCHEDA_LAVORAZIONE_COLUMNS)
    .eq("lavorazione_id", bundle.lavorazioneId);

  if (readError) {
    return { ok: false, kind: "error", error: readError.message };
  }

  const payloads = bundleToSchedaPayloads(bundle);
  const byTipo = new Map(
    (rows ?? [])
      .map((r) => {
        const normalized = normalizeSchedaTipoDb((r as { tipo: string }).tipo);
        return normalized ? ([normalized, r] as const) : null;
      })
      .filter((e): e is [NonNullable<ReturnType<typeof normalizeSchedaTipoDb>> & string, (typeof rows)[number]] => e !== null),
  );

  for (const part of payloads) {
    const row = byTipo.get(part.tipo);
    if (row && typeof (row as { id?: string }).id === "string") {
      const schedaId = (row as { id: string }).id;
      const updatePayload = schedaUpdateFromContenuto(part.contenuto);
      const { data: updated, error } = await sb
        .from("scheda_lavorazione")
        .update(updatePayload)
        .eq("id", schedaId)
        .select(SCHEDA_LAVORAZIONE_COLUMNS)
        .single();
      if (error || !updated) return { ok: false, kind: "error", error: error?.message ?? "Aggiornamento scheda fallito" };
      await writeModificaLog(sb, {
        entita: "scheda_lavorazione",
        entita_id: schedaId,
        azione: "UPDATE",
        payload: auditDiff(row, updated),
        autore_id: autoreId,
      });
    } else {
      const { data: inserted, error } = await sb
        .from("scheda_lavorazione")
        .insert(schedaInsertFromBundlePart(bundle.lavorazioneId, part.tipo, part.contenuto))
        .select(SCHEDA_LAVORAZIONE_COLUMNS)
        .single();
      if (error || !inserted) return { ok: false, kind: "error", error: error?.message ?? "Creazione scheda fallita" };
      await writeModificaLog(sb, {
        entita: "scheda_lavorazione",
        entita_id: (inserted as { id: string }).id,
        azione: "CREATE",
        payload: auditSnapshot(inserted),
        autore_id: autoreId,
      });
    }
  }

  return { ok: true };
}

export function createCaptureInterventoWriteDeps(input: {
  userId: string;
  captureFields: readonly CaptureFieldRow[];
  approvedCreates: CaptureApprovedCreates;
  magazzino?: readonly RicambioMagazzino[];
  existingLavorazioneId?: string | null;
}): InterventoWriteDeps {
  const schedaTipo = inferCaptureSchedaTipo(input.captureFields);
  const includeIngresso =
    schedaTipo === "ingresso" || schedaTipo === null || !input.existingLavorazioneId?.trim();
  const magazzino = input.magazzino ?? [];

  return {
    upsertMezzo: async ({ fields, preferredMezzoId, updatePlan, lavorazioneId, writeContext }) => {
      const sb = await createSupabaseServerUserClient();
      const catalog = await fetchCaptureMezziCatalog();
      const resolved = resolveMezzoFromScheda({
        scheda: fields,
        existingMezzi: catalog,
        preferredMezzoId,
      });
      if (resolved.resolution) {
        await logMezzoResolutionEvent(sb, {
          ...resolutionEventFromResult(
            "capture",
            resolved.resolution,
            {
              targa: fields.targa,
              matricola: fields.matricola,
              nScuderia: fields.nScuderia,
              vin: fields.vin,
            },
            { captureUserId: input.userId },
          ),
          createdBy: input.userId,
        });
      }
      const needsNewMezzo = !resolved.mezzoId && Boolean(fields.cliente.trim());
      if (needsNewMezzo && !input.approvedCreates.mezzo) {
        throw new MezzoSchedaValidationError("Creazione mezzo non approvata nel piano capture.");
      }

      const plan = updatePlan ?? resolveMezzoUpdatePlanFromContext(writeContext ?? { source: "import_ai" });

      const updateMezzo = async (id: string, patch: MezzoUpdate) => {
        if (mezzoUpdateTouchesAssociationFields(patch)) {
          throw new MezzoSchedaValidationError("ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH");
        }
        const payload = sanitizeMezzoWritePayload(patch, { v2Enabled: true, source: "document-capture-apply" });
        const { data: row, error } = await sb.from("mezzi").update(payload).eq("id", id).select(MEZZI_COLUMNS).single();
        if (error || !row) throw new MezzoSchedaValidationError(error?.message ?? "Aggiornamento mezzo fallito");
        return row as MezzoRow;
      };

      const applyAssociationChange = async (
        input: Parameters<typeof applyAssociationChangeDb>[1],
      ) => {
        const result = await applyAssociationChangeDb(sb, input);
        if (!result.ok) throw new MezzoSchedaValidationError(result.message);
        return result.row;
      };

      return upsertMezzoFromSchedaIngresso({
        fields,
        mezziCatalog: catalog,
        preferredMezzoId,
        updatePlan: plan,
        lavorazioneId,
        writeContext: writeContext ?? { source: "import_ai", mezzoUpdatePlan: plan },
        create: async () => {
          throw new MezzoSchedaValidationError("createMezzo deprecato: usare resolveOrCreateMezzo");
        },
        update: updateMezzo,
        applyAssociationChange,
        recordHistory: async (historyInput) => {
          await recordMezzoAnagraficaHistoryServer(sb, {
            ...historyInput,
            userId: input.userId,
          });
        },
        attrezzaturaResolveDeps: buildServerAttrezzaturaResolveDeps(sb),
        mezzoResolveDeps: buildServerMezzoResolveDeps(sb),
      });
    },
    createLavorazione: async (lavInput) => {
      const sb = await createSupabaseServerUserClient();
      const picked = pickLavorazioneCreatePayload(lavInput as Record<string, unknown>);
      const insertPayload = {
        ...picked,
        created_by: lavInput.created_by,
        updated_by: lavInput.created_by,
      };
      const { data: row, error } = await sb.from("lavorazioni").insert(insertPayload).select(LAVORAZIONI_COLUMNS).single();
      if (error || !row) throw new Error(error?.message ?? "Creazione lavorazione fallita");
      await writeModificaLog(sb, {
        entita: "lavorazioni",
        entita_id: (row as LavorazioneRow).id,
        azione: "CREATE",
        payload: auditSnapshot(row, { oggetto: "Document Capture apply" }),
        autore_id: input.userId,
      });
      return row as LavorazioneRow;
    },
    persistScheda: async ({ lavorazioneId, fields, createdBy }) => {
      const bundle = buildCaptureSchedeBundle({
        lavorazioneId,
        fields: input.captureFields,
        createdBy,
        includeLavorazioni: input.approvedCreates.lavorazioni,
        includeRicambi: input.approvedCreates.ricambi,
        schedaTipo,
        magazzino,
      });
      if (includeIngresso && bundle.ingresso) {
        bundle.ingresso = { ...bundle.ingresso, campi: { ...fields } };
      } else {
        bundle.ingresso = null;
      }
      return persistCaptureBundleServer(bundle, input.userId);
    },
  };
}
