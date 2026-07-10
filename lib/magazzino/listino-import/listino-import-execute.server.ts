import "server-only";

import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { prezzoVenditaDaListinoEMarkup } from "@/lib/magazzino/calculations";
import { resolveMagazzinoCategoriaFromMaster } from "@/lib/magazzino/magazzino-categoria-infer";
import { buildListinoImportMeta } from "@/lib/magazzino/listino-import/listino-import-meta";
import type { ListinoImportDecision } from "@/lib/magazzino/listino-import/listino-import-types";
import type { ListinoImportExecuteResult } from "@/lib/magazzino/listino-import/listino-import-types";
import { LISTINO_IMPORT_EXECUTE_CHUNK } from "@/lib/magazzino/listino-import/listino-import-types";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import { attachMagazzinoEntityKey } from "@/lib/validation/entity-persistence";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const DEFAULT_MARKUP_PERCENT = 0;

function normalizeDecisionRow(
  decision: ListinoImportDecision,
  marcaDefault: string,
): { codice: string; descrizione: string; costo: number; marca: string } | null {
  const codice = normalizeRicambioCodice(decision.codice);
  const descrizione = decision.descrizione.trim();
  const costo = decision.costo;
  const marca = (decision.marca ?? marcaDefault).trim();
  if (!codice || !descrizione || !Number.isFinite(costo) || costo < 0) return null;
  return { codice, descrizione, costo, marca: marca || "—" };
}

export async function executeListinoImport(input: {
  documentoId: string;
  documentoNome: string;
  batchId: string;
  marcaDefault: string;
  decisions: ListinoImportDecision[];
}): Promise<ListinoImportExecuteResult> {
  const sb = await createSupabaseServerUserClient();
  const settings = await resolveCabAppSettingsResolvedServer();
  const masterCategories = settings.magazzinoMaster.categorie.length
    ? settings.magazzinoMaster.categorie
    : ["Generale"];
  const result: ListinoImportExecuteResult = {
    batchId: input.batchId,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const chunks: ListinoImportDecision[][] = [];
  for (let i = 0; i < input.decisions.length; i += LISTINO_IMPORT_EXECUTE_CHUNK) {
    chunks.push(input.decisions.slice(i, i + LISTINO_IMPORT_EXECUTE_CHUNK));
  }

  for (const chunk of chunks) {
    for (const decision of chunk) {
      if (decision.action === "skip") {
        result.skipped += 1;
        continue;
      }

      const rowData = normalizeDecisionRow(decision, input.marcaDefault);
      if (!rowData) {
        result.errors.push({ rowIndex: decision.rowIndex, message: "Riga non valida." });
        continue;
      }

      if (decision.action === "update") {
        const targetId = decision.duplicateRicambioId;
        if (!targetId) {
          result.errors.push({ rowIndex: decision.rowIndex, message: "Nessun ricambio esistente da aggiornare." });
          continue;
        }
        const { data: existing, error: readErr } = await sb
          .from("magazzino_ricambi")
          .select("id, meta, nome")
          .eq("id", targetId)
          .maybeSingle();
        if (readErr || !existing) {
          result.errors.push({ rowIndex: decision.rowIndex, message: "Ricambio da aggiornare non trovato." });
          continue;
        }
        const meta =
          existing.meta && typeof existing.meta === "object" && !Array.isArray(existing.meta)
            ? { ...(existing.meta as Record<string, unknown>) }
            : {};
        const updatePayload = attachMagazzinoEntityKey({
          costo: rowData.costo,
          nome: existing.nome?.trim() ? existing.nome : rowData.descrizione,
          meta,
        });
        const { error: updErr } = await sb.from("magazzino_ricambi").update(updatePayload).eq("id", targetId);
        if (updErr) {
          result.errors.push({ rowIndex: decision.rowIndex, message: updErr.message });
          continue;
        }
        result.updated += 1;
        continue;
      }

      const listinoImport = buildListinoImportMeta({
        documentoId: input.documentoId,
        documentoNome: input.documentoNome,
        batchId: input.batchId,
      });
      const prezzoVendita = prezzoVenditaDaListinoEMarkup(rowData.costo, DEFAULT_MARKUP_PERCENT);
      const categoria = resolveMagazzinoCategoriaFromMaster(decision.categoria, masterCategories);
      const insertPayload = attachMagazzinoEntityKey({
        codice: rowData.codice,
        nome: rowData.descrizione,
        marca: rowData.marca === "—" ? null : rowData.marca,
        quantita: 0,
        costo: rowData.costo,
        prezzo_vendita: prezzoVendita > 0 ? prezzoVendita : null,
        consumo_medio_mensile: null,
        meta: {
          categoria,
          listinoImport,
        } as Record<string, unknown>,
      });

      const { error: insErr } = await sb.from("magazzino_ricambi").insert(insertPayload);
      if (insErr) {
        result.errors.push({ rowIndex: decision.rowIndex, message: insErr.message });
        continue;
      }
      result.created += 1;
    }
  }

  return result;
}

export async function fetchDocumentoForImport(
  documentoId: string,
): Promise<{ id: string; nome: string; marca: string }> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("documenti")
    .select("id, marca, meta, url_file, categoria")
    .eq("id", documentoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Documento non trovato.");
  const row = data as {
    categoria?: string;
    marca?: string | null;
    meta?: Record<string, unknown> | null;
    url_file?: string;
  };
  if (row.categoria !== "listino") throw new Error("Documento non è un listino.");
  const meta = row.meta ?? {};
  const nome =
    typeof meta.nome === "string" && meta.nome.trim()
      ? meta.nome.trim()
      : String(row.url_file ?? "").split("/").pop() || "Listino";
  return { id: documentoId, nome, marca: String(row.marca ?? "").trim() };
}
